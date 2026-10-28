import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { EntityManager, IsNull, Repository } from 'typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { CategoryEntity, CategoryKind } from '../categories/entities/category.entity';
import { ImportJobEntity, ImportJobStatus } from '../imports/entities/import-job.entity';
import { TransactionEntity, TransactionKind } from '../transactions/entities/transaction.entity';
import type { ParsedImportPreview, ParsedImportRow } from '../../shared/import-parser/types';
import { VaultChainHeadEntity } from './entities/vault-chain-head.entity';
import { VaultEventEntity, VaultEventType } from './entities/vault-event.entity';
import { VaultKeyEntity } from './entities/vault-key.entity';
import {
  chainDigest,
  canonicalize,
  publicKeyId,
  proofMessage,
  sha256,
  VAULT_GENESIS_HASH,
  verifyEd25519,
} from './vault.crypto';
import type { VaultProofDto } from './vault.dto';
import type { TransactionMutationInput } from '../transactions/transactions.commands';

export interface VaultClaim {
  sourceRow: number;
  operationId: string;
  fingerprint: string;
  payloadHash: string;
  canonicalPayload: string;
  claimDigest: string;
}

export interface VaultProofInput extends VaultProofDto {
  claim: VaultClaim;
}

@Injectable()
export class VaultService {
  constructor(
    @InjectRepository(VaultKeyEntity) private readonly keys: Repository<VaultKeyEntity>,
    @InjectRepository(VaultEventEntity) private readonly events: Repository<VaultEventEntity>,
    @InjectRepository(VaultChainHeadEntity)
    private readonly heads: Repository<VaultChainHeadEntity>,
    @InjectRepository(ImportJobEntity) private readonly jobs: Repository<ImportJobEntity>,
    @InjectRepository(AccountEntity) private readonly accounts: Repository<AccountEntity>,
    @InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>,
  ) {}

  async registerKey(
    userId: string,
    publicKey: string,
    encryptedPrivateKey: Record<string, string>,
    keyVersion: number,
  ) {
    if (Buffer.from(publicKey, 'base64').length !== 32) {
      throw new BadRequestException('VAULT_PUBLIC_KEY_INVALID');
    }
    const existing = await this.keys.findOne({ where: { userId } });
    if (
      existing &&
      (existing.publicKey !== publicKey ||
        existing.keyVersion !== keyVersion ||
        canonicalize(existing.encryptedPrivateKey) !== canonicalize(encryptedPrivateKey))
    ) {
      throw new BadRequestException('VAULT_KEY_ALREADY_REGISTERED');
    }
    await this.keys.upsert({ userId, publicKey, encryptedPrivateKey, keyVersion }, ['userId']);
    const key = await this.keys.findOneOrFail({ where: { userId } });
    return this.toKeyView(key);
  }

  async getKey(userId: string) {
    const key = await this.keys.findOne({ where: { userId } });
    return key ? this.toKeyView(key) : null;
  }

  async prepareImportConfirmation(
    userId: string,
    jobId: string,
  ): Promise<{ claims: VaultClaim[] }> {
    const job = await this.jobs.findOne({ where: { id: jobId, userId } });
    if (!job) throw new NotFoundException('IMPORT_NOT_FOUND');
    if (job.status !== ImportJobStatus.Preview || !job.preview) {
      throw new BadRequestException('IMPORT_NOT_READY');
    }
    const [accounts, categories] = await Promise.all([
      this.accounts.find({ where: { userId, archivedAt: IsNull() } }),
      this.categories.find({ where: { userId, archivedAt: IsNull() } }),
    ]);
    return {
      claims: (job.preview as ParsedImportPreview).rows
        .filter((row) => row.valid)
        .map((row) => this.claimForRow(userId, job, row, accounts, categories)),
    };
  }

  validateProofs(
    claims: VaultClaim[],
    proofs: VaultProofDto[],
    publicKey: string,
    keyVersion?: number,
  ): VaultProofInput[] {
    if (claims.length !== proofs.length) throw new BadRequestException('VAULT_PROOFS_REQUIRED');
    const claimByRow = new Map(claims.map((claim) => [claim.sourceRow, claim]));
    if (claimByRow.size !== claims.length) throw new BadRequestException('VAULT_PROOF_INVALID');
    const seenRows = new Set<number>();
    const validated = proofs.map((proof) => {
      const claim = claimByRow.get(proof.sourceRow);
      if (seenRows.has(proof.sourceRow)) throw new BadRequestException('VAULT_PROOF_INVALID');
      seenRows.add(proof.sourceRow);
      let signatureValid = false;
      try {
        signatureValid = Boolean(
          claim &&
          verifyEd25519(
            publicKey,
            proofMessage({
              claimDigest: claim.claimDigest,
              ciphertext: proof.ciphertext,
              iv: proof.iv,
              authTag: proof.authTag,
              keyVersion: proof.keyVersion,
            }),
            proof.signature,
          ),
        );
      } catch {
        signatureValid = false;
      }
      if (
        !claim ||
        proof.fingerprint !== claim.fingerprint ||
        proof.payloadHash !== claim.payloadHash ||
        proof.publicKeyId !== publicKeyId(publicKey) ||
        (keyVersion !== undefined && proof.keyVersion !== keyVersion) ||
        !signatureValid
      ) {
        throw new BadRequestException('VAULT_PROOF_INVALID');
      }
      return { ...proof, claim };
    });
    if (seenRows.size !== claimByRow.size) throw new BadRequestException('VAULT_PROOF_INVALID');
    return validated;
  }

  createManualClaim(
    userId: string,
    input: Omit<TransactionMutationInput, 'proof'>,
    accountId: string,
    destinationAccountId: string | null,
    categoryId: string | null,
    transactionId?: string,
  ): VaultClaim {
    const payload = {
      date: input.date,
      kind: input.kind,
      amount: input.amount.toFixed(2),
      accountId,
      destinationAccountId,
      categoryId,
      note: input.note?.trim() || null,
      operationId: input.operationId,
      transactionId: transactionId ?? null,
    };
    return this.claimFromPayload(userId, payload, input.operationId);
  }

  createReversalClaim(
    userId: string,
    transaction: TransactionEntity,
    operationId: string,
  ): VaultClaim {
    return this.claimFromPayload(
      userId,
      { transactionId: transaction.id, operationId },
      operationId,
    );
  }

  async appendTransactionEvents(
    manager: EntityManager,
    userId: string,
    transactions: Array<{
      transaction: TransactionEntity;
      proof: VaultProofInput;
      eventType: VaultEventType;
      operationId: string;
    }>,
  ): Promise<void> {
    if (!transactions.length) return;
    const key = await manager.getRepository(VaultKeyEntity).findOne({ where: { userId } });
    if (!key) throw new BadRequestException('VAULT_KEY_REQUIRED');

    await manager.query(
      `INSERT INTO "vault_chain_heads" ("user_id", "sequence", "last_hash") VALUES ($1, 0, $2) ON CONFLICT ("user_id") DO NOTHING`,
      [userId, VAULT_GENESIS_HASH],
    );
    const head = await manager
      .getRepository(VaultChainHeadEntity)
      .createQueryBuilder('head')
      .setLock('pessimistic_write')
      .where('head.userId = :userId', { userId })
      .getOneOrFail();

    let sequence = Number(head.sequence);
    let previousHash = head.lastHash;
    const eventRepository = manager.getRepository(VaultEventEntity);
    for (const item of transactions) {
      sequence += 1;
      const schemaVersion = 2;
      const eventHash = chainDigest({
        schemaVersion,
        userId,
        sequence: String(sequence),
        eventType: item.eventType,
        transactionId: item.transaction.id,
        operationId: item.operationId,
        payloadHash: item.proof.payloadHash,
        claimDigest: item.proof.claim.claimDigest,
        ciphertext: item.proof.ciphertext,
        iv: item.proof.iv,
        authTag: item.proof.authTag,
        keyVersion: item.proof.keyVersion,
        previousHash,
      });
      await eventRepository.insert(
        eventRepository.create({
          userId,
          sequence: String(sequence),
          eventType: item.eventType,
          transactionId: item.transaction.id,
          operationId: item.operationId,
          importJobId: item.transaction.importJobId,
          importRow: item.transaction.importRow,
          ciphertext: item.proof.ciphertext,
          iv: item.proof.iv,
          authTag: item.proof.authTag,
          keyVersion: item.proof.keyVersion,
          payloadHash: item.proof.payloadHash,
          fingerprint: item.proof.fingerprint,
          claimDigest: item.proof.claim.claimDigest,
          signature: item.proof.signature,
          publicKeyId: item.proof.publicKeyId,
          previousHash,
          eventHash,
          schemaVersion,
        }),
      );
      previousHash = eventHash;
    }
    await manager
      .getRepository(VaultChainHeadEntity)
      .update({ userId }, { sequence: String(sequence), lastHash: previousHash });
  }

  async listEvents(userId: string) {
    return this.events.find({ where: { userId }, order: { sequence: 'DESC' }, take: 100 });
  }

  async getEvent(userId: string, eventId: string) {
    const event = await this.events.findOne({ where: { id: eventId, userId } });
    if (!event) throw new NotFoundException('VAULT_EVENT_NOT_FOUND');
    return event;
  }

  async verifyIntegrity(userId: string) {
    const events = await this.events.find({ where: { userId }, order: { sequence: 'ASC' } });
    const key = await this.keys.findOne({ where: { userId } });
    if (!key && events.length) {
      return {
        valid: false,
        checkedEvents: 0,
        firstInvalidEventId: events[0].id,
        reason: 'VAULT_KEY_MISSING',
      };
    }
    let previousHash = VAULT_GENESIS_HASH;
    let expectedSequence = 1;
    for (const event of events) {
      const expectedHash = chainDigest({
        schemaVersion: event.schemaVersion,
        userId,
        sequence: event.sequence,
        eventType: event.eventType,
        transactionId: event.transactionId,
        payloadHash: event.payloadHash,
        claimDigest: event.claimDigest,
        ciphertext: event.ciphertext,
        ...(event.schemaVersion >= 2
          ? {
              operationId: event.operationId,
              iv: event.iv,
              authTag: event.authTag,
              keyVersion: event.keyVersion,
            }
          : {}),
        previousHash,
      });
      let signatureValid = false;
      try {
        signatureValid = Boolean(
          key &&
          verifyEd25519(
            key.publicKey,
            event.schemaVersion >= 2
              ? proofMessage({
                  claimDigest: event.claimDigest,
                  ciphertext: event.ciphertext,
                  iv: event.iv,
                  authTag: event.authTag,
                  keyVersion: event.keyVersion,
                })
              : event.claimDigest,
            event.signature,
          ),
        );
      } catch {
        signatureValid = false;
      }
      if (
        Number(event.sequence) !== expectedSequence ||
        event.previousHash !== previousHash ||
        event.eventHash !== expectedHash ||
        !key ||
        event.publicKeyId !== publicKeyId(key.publicKey) ||
        !signatureValid
      ) {
        return {
          valid: false,
          checkedEvents: expectedSequence - 1,
          firstInvalidEventId: event.id,
          reason: 'VAULT_CHAIN_INVALID',
        };
      }
      previousHash = event.eventHash;
      expectedSequence += 1;
    }
    const head = await this.heads.findOne({ where: { userId } });
    if (
      events.length > 0 &&
      (!head || Number(head.sequence) !== events.length || head.lastHash !== previousHash)
    ) {
      return {
        valid: false,
        checkedEvents: events.length,
        reason: 'VAULT_HEAD_INVALID',
      };
    }
    return {
      valid: true,
      checkedEvents: events.length,
      lastSequence: events.length ? String(events.length) : '0',
      lastHash: previousHash,
    };
  }

  private claimForRow(
    userId: string,
    job: ImportJobEntity,
    row: ParsedImportRow,
    accounts: AccountEntity[],
    categories: CategoryEntity[],
  ): VaultClaim {
    const account = accounts.find(
      (item) =>
        item.name.toLocaleLowerCase('ru-RU') === row.accountName?.toLocaleLowerCase('ru-RU'),
    );
    const destination = accounts.find(
      (item) =>
        item.name.toLocaleLowerCase('ru-RU') ===
        row.destinationAccountName?.toLocaleLowerCase('ru-RU'),
    );
    const category = categories.find(
      (item) =>
        item.name.toLocaleLowerCase('ru-RU') === row.categoryName?.toLocaleLowerCase('ru-RU') &&
        item.kind === (row.type === 'income' ? CategoryKind.Income : CategoryKind.Expense),
    );
    if (
      !account ||
      (row.type === 'transfer' && !destination) ||
      (row.type !== 'transfer' && Boolean(row.categoryName) && !category)
    ) {
      throw new BadRequestException('IMPORT_REFERENCE_INVALID');
    }
    const fingerprint = createHash('sha256')
      .update(
        [
          userId,
          job.id,
          row.sourceRow,
          row.date,
          row.type,
          row.amount,
          account.id,
          destination?.id ?? '',
          category?.id ?? '',
          row.note ?? '',
        ].join('|'),
      )
      .digest('hex');
    const payload = {
      date: row.date,
      kind: row.type as TransactionKind,
      amount: row.amount?.toFixed(2),
      accountId: account.id,
      destinationAccountId: destination?.id ?? null,
      categoryId: category?.id ?? null,
      note: row.note,
      importJobId: job.id,
      importRow: row.sourceRow,
      sourceRef: row.sourceRef,
      sourceSha256: (job.preview as ParsedImportPreview).sourceSha256 ?? job.sourceSha256 ?? null,
      parserId: (job.preview as ParsedImportPreview).parserId,
      parserVersion: (job.preview as ParsedImportPreview).parserVersion,
      templateId: (job.preview as ParsedImportPreview).templateId,
      profileId: (job.preview as ParsedImportPreview).profileId,
      profileVersion: (job.preview as ParsedImportPreview).profileVersion,
      profileDigest: (job.preview as ParsedImportPreview).profileDigest,
      fingerprint,
    };
    const canonicalPayload = canonicalize(payload);
    const payloadHash = sha256(canonicalPayload);
    return {
      sourceRow: row.sourceRow,
      operationId: `import:${job.id}:${row.sourceRow}`,
      fingerprint,
      payloadHash,
      canonicalPayload,
      claimDigest: sha256(
        canonicalize({
          fingerprint,
          payloadHash,
          importJobId: job.id,
          sourceRow: row.sourceRow,
          operationId: `import:${job.id}:${row.sourceRow}`,
        }),
      ),
    };
  }

  private claimFromPayload(
    userId: string,
    payload: Record<string, unknown>,
    sourceKey: string,
  ): VaultClaim {
    const canonicalPayload = canonicalize(payload);
    const payloadHash = sha256(canonicalPayload);
    const fingerprint = sha256(canonicalize({ userId, sourceKey, payloadHash }));
    return {
      sourceRow: 1,
      operationId: sourceKey,
      fingerprint,
      payloadHash,
      canonicalPayload,
      claimDigest: sha256(canonicalize({ fingerprint, payloadHash, operationId: sourceKey })),
    };
  }

  private toKeyView(key: VaultKeyEntity) {
    return {
      publicKey: key.publicKey,
      encryptedPrivateKey: key.encryptedPrivateKey,
      keyVersion: key.keyVersion,
    };
  }
}
