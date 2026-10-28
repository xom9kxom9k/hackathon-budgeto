import { generateKeyPairSync, sign } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { CategoryKind } from '../categories/entities/category.entity';
import { ImportJobStatus } from '../imports/entities/import-job.entity';
import { VaultChainHeadEntity } from './entities/vault-chain-head.entity';
import { VaultEventEntity, VaultEventType } from './entities/vault-event.entity';
import { VaultKeyEntity } from './entities/vault-key.entity';
import { VaultService } from './vault.service';
import {
  canonicalize,
  chainDigest,
  proofMessage,
  publicKeyId,
  sha256,
  VAULT_GENESIS_HASH,
} from './vault.crypto';

function createService(preview: Record<string, unknown>) {
  const job = {
    id: 'job-1',
    userId: 'user-1',
    status: ImportJobStatus.Preview,
    preview,
  };
  const jobs = { findOne: vi.fn(async () => job) };
  const accounts = {
    find: vi.fn(async () => [{ id: 'account-1', name: 'Card', archivedAt: null }]),
  };
  const categories = {
    find: vi.fn(async () => [{ id: 'category-1', name: 'Food', kind: CategoryKind.Expense }]),
  };
  return new VaultService(
    {} as never,
    {} as never,
    {} as never,
    jobs as never,
    accounts as never,
    categories as never,
  );
}

const row = {
  sourceRow: 2,
  sourceRef: { kind: 'csv' as const, record: 2 },
  date: '2026-02-01',
  type: 'expense' as const,
  amount: 12.5,
  accountName: 'Card',
  destinationAccountName: null,
  categoryName: 'Food',
  note: 'Coffee',
  valid: true,
  errors: [],
  warnings: [],
};

function preview(profileDigest = 'profile-digest') {
  return {
    format: 'generic-csv',
    parserId: 'csv-header-map',
    parserVersion: '1.0.0',
    templateId: 'generic-csv-table',
    sourceSha256: 'source-sha256',
    profileId: 'bank-csv',
    profileVersion: '2.1.0',
    profileDigest,
    confidence: 0.98,
    total: 1,
    valid: 1,
    invalid: 0,
    rows: [row],
  };
}

describe('Vault import provenance', () => {
  it('binds source and profile metadata into the signed claim payload', async () => {
    const service = createService(preview());
    const result = await service.prepareImportConfirmation('user-1', 'job-1');
    const claim = result.claims[0];
    const payload = JSON.parse(claim.canonicalPayload) as Record<string, unknown>;

    expect(payload).toMatchObject({
      sourceRef: { kind: 'csv', record: 2 },
      sourceSha256: 'source-sha256',
      parserId: 'csv-header-map',
      parserVersion: '1.0.0',
      profileId: 'bank-csv',
      profileVersion: '2.1.0',
      profileDigest: 'profile-digest',
    });
    expect(claim.payloadHash).toBe(sha256(claim.canonicalPayload));
    expect(claim.claimDigest).toBe(
      sha256(
        canonicalize({
          fingerprint: claim.fingerprint,
          payloadHash: claim.payloadHash,
          importJobId: 'job-1',
          sourceRow: 2,
          operationId: 'import:job-1:2',
        }),
      ),
    );
  });

  it('changes the payload hash when profile provenance changes', async () => {
    const first = await createService(preview('profile-v1')).prepareImportConfirmation(
      'user-1',
      'job-1',
    );
    const second = await createService(preview('profile-v2')).prepareImportConfirmation(
      'user-1',
      'job-1',
    );

    expect(first.claims[0].payloadHash).not.toBe(second.claims[0].payloadHash);
    expect(first.claims[0].claimDigest).not.toBe(second.claims[0].claimDigest);
  });

  it('binds the original row and correction history into the claim payload', async () => {
    const service = createService({
      ...preview('profile-edited'),
      originalRows: [{ ...row, note: null }],
      editLog: [
        {
          sourceRow: 2,
          fields: ['note'],
          before: { note: null },
          after: { note: 'Corrected note' },
          editHash: 'edit-hash',
        },
      ],
    });
    const result = await service.prepareImportConfirmation('user-1', 'job-1');
    const payload = JSON.parse(result.claims[0].canonicalPayload) as Record<string, unknown>;

    expect(payload.originalImportRow).toMatchObject({ sourceRow: 2, note: null });
    expect(payload.importEdits).toEqual([
      expect.objectContaining({ sourceRow: 2, editHash: 'edit-hash' }),
    ]);
  });

  it('records the import claim in the signed hash-chain and detects tampering', async () => {
    const service = createService(preview('profile-chain'));
    const { claims } = await service.prepareImportConfirmation('user-1', 'job-1');
    const claim = claims[0];
    const keyPair = generateKeyPairSync('ed25519');
    const spki = keyPair.publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
    const publicKey = spki.subarray(-32).toString('base64');
    const proofFields = {
      claimDigest: claim.claimDigest,
      ciphertext: 'ciphertext',
      iv: 'iv',
      authTag: 'auth-tag',
      keyVersion: 1,
    };
    const proof = {
      sourceRow: claim.sourceRow,
      fingerprint: claim.fingerprint,
      payloadHash: claim.payloadHash,
      ciphertext: proofFields.ciphertext,
      iv: proofFields.iv,
      authTag: proofFields.authTag,
      keyVersion: proofFields.keyVersion,
      publicKeyId: publicKeyId(publicKey),
      signature: sign(null, Buffer.from(proofMessage(proofFields)), keyPair.privateKey).toString(
        'base64',
      ),
      claim,
    };
    const events: Record<string, unknown>[] = [];
    const head: Record<string, unknown> = {
      userId: 'user-1',
      sequence: '0',
      lastHash: VAULT_GENESIS_HASH,
    };
    const key = { userId: 'user-1', publicKey, keyVersion: 1 };
    const eventRepository = {
      create: vi.fn((value: Record<string, unknown>) => value),
      insert: vi.fn(async (value: Record<string, unknown>) => {
        events.push({ ...value, id: 'event-1' });
      }),
    };
    const headRepository = {
      createQueryBuilder: vi.fn(() => {
        const builder = {
          setLock: () => builder,
          where: () => builder,
          getOneOrFail: async () => head,
        };
        return builder;
      }),
      update: vi.fn(async (_where: unknown, value: Record<string, unknown>) => {
        Object.assign(head, value);
      }),
      findOne: vi.fn(async () => head),
    };
    const keyRepository = { findOne: vi.fn(async () => key) };
    const eventStore = { find: vi.fn(async () => events) };
    const chainService = new VaultService(
      keyRepository as never,
      eventStore as never,
      headRepository as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const manager = {
      query: vi.fn(async () => undefined),
      getRepository: (entity: unknown) => {
        if (entity === VaultKeyEntity) return keyRepository;
        if (entity === VaultChainHeadEntity) return headRepository;
        if (entity === VaultEventEntity) return eventRepository;
        throw new Error('unexpected repository');
      },
    };
    const transaction = {
      id: 'transaction-1',
      importJobId: 'job-1',
      importRow: claim.sourceRow,
    };

    await chainService.appendTransactionEvents(manager as never, 'user-1', [
      {
        transaction: transaction as never,
        proof: proof as never,
        eventType: VaultEventType.TransactionConfirmed,
        operationId: claim.operationId,
      },
    ]);

    const event = events[0];
    expect(event).toMatchObject({
      importJobId: 'job-1',
      importRow: 2,
      payloadHash: claim.payloadHash,
      claimDigest: claim.claimDigest,
      previousHash: VAULT_GENESIS_HASH,
      schemaVersion: 2,
    });
    expect(event.eventHash).toBe(
      chainDigest({
        schemaVersion: 2,
        userId: 'user-1',
        sequence: '1',
        eventType: VaultEventType.TransactionConfirmed,
        transactionId: 'transaction-1',
        operationId: claim.operationId,
        payloadHash: claim.payloadHash,
        claimDigest: claim.claimDigest,
        ciphertext: proofFields.ciphertext,
        iv: proofFields.iv,
        authTag: proofFields.authTag,
        keyVersion: 1,
        previousHash: VAULT_GENESIS_HASH,
      }),
    );
    expect(head).toMatchObject({ sequence: '1', lastHash: event.eventHash });

    const integrity = await chainService.verifyIntegrity('user-1');
    expect(integrity).toMatchObject({ valid: true, checkedEvents: 1, lastHash: event.eventHash });

    event.eventHash = '0'.repeat(64);
    await expect(chainService.verifyIntegrity('user-1')).resolves.toMatchObject({
      valid: false,
      reason: 'VAULT_CHAIN_INVALID',
    });
  });
});
