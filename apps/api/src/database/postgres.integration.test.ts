import 'reflect-metadata';

import { generateKeyPairSync, sign } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AccountEntity } from '../modules/accounts/entities/account.entity';
import { CategoryEntity, CategoryKind } from '../modules/categories/entities/category.entity';
import { UserEntity } from '../modules/auth/entities/user.entity';
import { ImportJobEntity, ImportJobStatus } from '../modules/imports/entities/import-job.entity';
import { ImportsService } from '../modules/imports/imports.service';
import {
  TransactionEntity,
  TransactionKind,
} from '../modules/transactions/entities/transaction.entity';
import { VaultChainHeadEntity } from '../modules/vault/entities/vault-chain-head.entity';
import { VaultEventEntity, VaultEventType } from '../modules/vault/entities/vault-event.entity';
import { VaultKeyEntity } from '../modules/vault/entities/vault-key.entity';
import { VaultService } from '../modules/vault/vault.service';
import {
  chainDigest,
  proofMessage,
  publicKeyId,
  VAULT_GENESIS_HASH,
} from '../modules/vault/vault.crypto';
import { AddImportSourceHash1710000000008 } from './migrations/1710000000008-AddImportSourceHash';
import { AddImportCountersAndVaultOperations1710000000007 } from './migrations/1710000000007-AddImportCountersAndVaultOperations';
import { AddUserPreferences1710000000006 } from './migrations/1710000000006-AddUserPreferences';
import { AddTransactionReversal1710000000005 } from './migrations/1710000000005-AddTransactionReversal';
import { AddReferenceArchiving1710000000004 } from './migrations/1710000000004-AddReferenceArchiving';
import { CreateVaultProvenance1710000000003 } from './migrations/1710000000003-CreateVaultProvenance';
import { CreateImportTransactions1710000000002 } from './migrations/1710000000002-CreateImportTransactions';
import { AddUserOnboarding1710000000001 } from './migrations/1710000000001-AddUserOnboarding';
import { CreateAuthAndAccounts1710000000000 } from './migrations/1710000000000-CreateAuthAndAccounts';

const migrationClasses = [
  CreateAuthAndAccounts1710000000000,
  AddUserOnboarding1710000000001,
  CreateImportTransactions1710000000002,
  CreateVaultProvenance1710000000003,
  AddReferenceArchiving1710000000004,
  AddTransactionReversal1710000000005,
  AddUserPreferences1710000000006,
  AddImportCountersAndVaultOperations1710000000007,
  AddImportSourceHash1710000000008,
];

const entities = [
  UserEntity,
  AccountEntity,
  CategoryEntity,
  ImportJobEntity,
  TransactionEntity,
  VaultKeyEntity,
  VaultEventEntity,
  VaultChainHeadEntity,
];
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required for PostgreSQL integration tests');

function databaseOptions(url: string, schema: string) {
  return {
    type: 'postgres' as const,
    url,
    schema,
    entities,
    migrations: migrationClasses,
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    logging: false,
    extra: { options: `-c search_path=${schema}` },
  };
}

async function createSchema(dataSource: DataSource, schema: string) {
  await dataSource.query(`CREATE SCHEMA "${schema}"`);
}

async function migrateLegacySchema(dataSource: DataSource, schema: string) {
  await createSchema(dataSource, schema);
  const scoped = new DataSource(databaseOptions(databaseUrl!, schema));
  let runner: ReturnType<DataSource['createQueryRunner']> | undefined;
  try {
    await scoped.initialize();
    runner = scoped.createQueryRunner();
    await runner.connect();
    for (const Migration of migrationClasses.slice(0, 7)) {
      await new Migration().up(runner);
    }

    const userId = randomUUID();
    const accountId = randomUUID();
    const transactionId = randomUUID();
    const keyPair = generateKeyPairSync('ed25519');
    const publicKey = (keyPair.publicKey.export({ type: 'spki', format: 'der' }) as Buffer)
      .subarray(-32)
      .toString('base64');
    await runner.query(`INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'hash')`, [
      userId,
      `${userId}@example.test`,
    ]);
    await runner.query(
      `INSERT INTO accounts (id, user_id, name, currency) VALUES ($1, $2, 'Account', 'RUB')`,
      [accountId, userId],
    );
    await runner.query(
      `INSERT INTO transactions (id, user_id, account_id, date, kind, amount, fingerprint) VALUES ($1, $2, $3, '2026-01-01', 'expense', 1, 'legacy-fingerprint')`,
      [transactionId, userId, accountId],
    );
    await runner.query(
      `INSERT INTO vault_keys (user_id, public_key, encrypted_private_key, key_version) VALUES ($1, $2, '{}', 1)`,
      [userId, publicKey],
    );

    const event = {
      userId,
      sequence: '1',
      eventType: VaultEventType.TransactionConfirmed,
      transactionId,
      ciphertext: 'legacy-ciphertext',
      iv: 'legacy-iv',
      authTag: 'legacy-tag',
      keyVersion: 1,
      payloadHash: 'legacy-payload-hash',
      fingerprint: 'legacy-fingerprint',
      claimDigest: 'legacy-claim-digest',
      signature: sign(null, Buffer.from('legacy-claim-digest'), keyPair.privateKey).toString(
        'base64',
      ),
      publicKeyId: publicKeyId(publicKey),
      previousHash: VAULT_GENESIS_HASH,
      schemaVersion: 1,
    };
    const eventHash = chainDigest({
      schemaVersion: event.schemaVersion,
      userId: event.userId,
      sequence: event.sequence,
      eventType: event.eventType,
      transactionId: event.transactionId,
      payloadHash: event.payloadHash,
      claimDigest: event.claimDigest,
      ciphertext: event.ciphertext,
      previousHash: event.previousHash,
    });
    const [inserted] = await runner.query(
      `INSERT INTO vault_events (user_id, sequence, event_type, transaction_id, ciphertext, iv, auth_tag, key_version, payload_hash, fingerprint, claim_digest, signature, public_key_id, previous_hash, event_hash, schema_version) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
      [
        userId,
        event.sequence,
        event.eventType,
        transactionId,
        event.ciphertext,
        event.iv,
        event.authTag,
        event.keyVersion,
        event.payloadHash,
        event.fingerprint,
        event.claimDigest,
        event.signature,
        event.publicKeyId,
        event.previousHash,
        eventHash,
        event.schemaVersion,
      ],
    );
    await runner.query(
      `INSERT INTO vault_chain_heads (user_id, sequence, last_hash) VALUES ($1, 1, $2)`,
      [userId, eventHash],
    );

    for (const Migration of migrationClasses.slice(7)) {
      await new Migration().up(runner);
    }

    const [migrated] = await runner.query(`SELECT operation_id FROM vault_events WHERE id = $1`, [
      inserted.id,
    ]);
    expect(migrated.operation_id).toBe(`legacy:${inserted.id}`);
    const vault = new VaultService(
      scoped.getRepository(VaultKeyEntity),
      scoped.getRepository(VaultEventEntity),
      scoped.getRepository(VaultChainHeadEntity),
      scoped.getRepository(ImportJobEntity),
      scoped.getRepository(AccountEntity),
      scoped.getRepository(CategoryEntity),
    );
    await expect(vault.verifyIntegrity(userId)).resolves.toMatchObject({
      valid: true,
      checkedEvents: 1,
      lastSequence: '1',
    });
  } finally {
    if (runner?.isReleased === false) await runner.release();
    if (scoped.isInitialized) await scoped.destroy();
    await dataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  }
}

const itWithPostgres = it;

describe('PostgreSQL integration', () => {
  let admin: DataSource;
  let dataSource: DataSource;
  let schema: string;

  beforeAll(async () => {
    if (!databaseUrl) return;
    const databaseName = new URL(databaseUrl).pathname.slice(1);
    if (!/test/i.test(databaseName)) {
      throw new Error('TEST_DATABASE_URL must point to a database with "test" in its name');
    }
    admin = new DataSource({ type: 'postgres', url: databaseUrl });
    await admin.initialize();
    schema = `budgetto_it_${process.pid}_${randomUUID().replaceAll('-', '')}`;
    await createSchema(admin, schema);
    dataSource = new DataSource(databaseOptions(databaseUrl, schema));
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'all' });
  }, 30_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (admin?.isInitialized && schema) {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.destroy();
    }
  });

  itWithPostgres('applies and rolls back the full migration chain', async () => {
    const columns = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'import_jobs'`,
      [schema],
    );
    expect(columns.map((column: { column_name: string }) => column.column_name)).toEqual(
      expect.arrayContaining(['created_count', 'skipped_count', 'source_sha256']),
    );
    const migrations = await dataSource.showMigrations();
    expect(migrations).toBe(false);

    for (let remaining = migrationClasses.length; remaining > 0; remaining -= 1) {
      await dataSource.undoLastMigration({ transaction: 'all' });
      const history = await dataSource.query(`SELECT * FROM "${schema}"."typeorm_migrations"`);
      expect(history).toHaveLength(remaining - 1);
    }
    const tables = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
      [schema],
    );
    expect(tables.map((table: { table_name: string }) => table.table_name)).toEqual([
      'typeorm_migrations',
    ]);
    expect(await dataSource.runMigrations({ transaction: 'all' })).toHaveLength(
      migrationClasses.length,
    );
    expect(await dataSource.showMigrations()).toBe(false);
  });

  itWithPostgres('serializes concurrent confirmation and returns one stable result', async () => {
    const context = await createConfirmationContext(dataSource);
    const service = createImportService(dataSource, context.vault);
    const blocker = dataSource.createQueryRunner();
    await blocker.connect();
    await blocker.startTransaction();
    let pending: Promise<{ created: number; skipped: number }[]> | undefined;
    try {
      await blocker.query('SELECT id FROM import_jobs WHERE id = $1 FOR UPDATE', [context.job.id]);
      pending = Promise.all([
        service.confirm(context.userId, context.job.id, context.proofs),
        service.confirm(context.userId, context.job.id, context.proofs),
      ]);
      await expect
        .poll(
          async () => {
            const [{ count }] = await admin.query(
              "SELECT count(*)::int AS count FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0 AND query LIKE '%import_jobs%' AND datname = current_database()",
            );
            return count;
          },
          { timeout: 5000 },
        )
        .toBe(2);
    } finally {
      await blocker.rollbackTransaction();
      await blocker.release();
      if (pending) await pending.catch(() => undefined);
    }
    const outcomes = await pending!;
    expect(outcomes).toEqual([
      { created: 1, skipped: 0 },
      { created: 1, skipped: 0 },
    ]);
    expect(
      await dataSource
        .getRepository(TransactionEntity)
        .count({ where: { userId: context.userId } }),
    ).toBe(1);
    expect(
      await dataSource.getRepository(VaultEventEntity).count({ where: { userId: context.userId } }),
    ).toBe(1);
  });

  itWithPostgres('skips a transaction whose fingerprint already exists', async () => {
    const context = await createConfirmationContext(dataSource);
    const claim = (await context.vault.prepareImportConfirmation(context.userId, context.job.id))
      .claims[0];
    await dataSource.getRepository(TransactionEntity).save({
      userId: context.userId,
      accountId: context.account.id,
      destinationAccountId: null,
      categoryId: context.category.id,
      date: '2026-02-01',
      kind: TransactionKind.Expense,
      amount: '12.50',
      note: 'Already recorded',
      fingerprint: claim.fingerprint,
      importJobId: null,
      importRow: null,
    });

    await expect(
      createImportService(dataSource, context.vault).confirm(
        context.userId,
        context.job.id,
        context.proofs,
      ),
    ).resolves.toEqual({ created: 0, skipped: 1 });
    expect(
      await dataSource.getRepository(VaultEventEntity).count({ where: { userId: context.userId } }),
    ).toBe(0);
  });

  itWithPostgres(
    'enforces fingerprint uniqueness and handles an insert conflict after a stale precheck',
    async () => {
      const context = await createConfirmationContext(dataSource);
      const repository = dataSource.getRepository(TransactionEntity);
      const input = {
        userId: context.userId,
        accountId: context.account.id,
        date: '2026-02-01',
        kind: TransactionKind.Expense,
        amount: '12.50',
        fingerprint: context.proofs[0].fingerprint,
      };
      await repository.insert(input);
      await expect(repository.insert({ ...input, id: randomUUID() })).rejects.toMatchObject({
        driverError: { code: '23505', constraint: 'UQ_transactions_user_fingerprint' },
      });
      const staleRead = vi.spyOn(Repository.prototype, 'exists').mockResolvedValue(false);
      try {
        await expect(
          createImportService(dataSource, context.vault).confirm(
            context.userId,
            context.job.id,
            context.proofs,
          ),
        ).resolves.toEqual({ created: 0, skipped: 1 });
        expect(staleRead).toHaveBeenCalled();
      } finally {
        staleRead.mockRestore();
      }
      expect(await repository.count({ where: { userId: context.userId } })).toBe(1);
      expect(
        await dataSource
          .getRepository(VaultEventEntity)
          .count({ where: { userId: context.userId } }),
      ).toBe(0);
      expect(
        await dataSource.getRepository(ImportJobEntity).findOneByOrFail({ id: context.job.id }),
      ).toMatchObject({
        status: ImportJobStatus.Confirmed,
        createdCount: 0,
        skippedCount: 1,
      });
    },
  );

  itWithPostgres('migrates and verifies a schema v1 Vault event', async () => {
    await migrateLegacySchema(
      admin,
      `budgetto_legacy_${process.pid}_${randomUUID().replaceAll('-', '')}`,
    );
  });
});

function createImportService(dataSource: DataSource, vault: VaultService): ImportsService {
  return Object.assign(Object.create(ImportsService.prototype) as ImportsService, {
    jobs: dataSource.getRepository(ImportJobEntity),
    dataSource,
    vault,
  });
}

async function createConfirmationContext(dataSource: DataSource) {
  const userId = randomUUID();
  const user = await dataSource.getRepository(UserEntity).save({
    id: userId,
    email: `${userId}@example.test`,
    passwordHash: 'hash',
  });
  const account = await dataSource.getRepository(AccountEntity).save({
    userId: user.id,
    name: 'Test account',
    currency: 'RUB',
    archivedAt: null,
  });
  const category = await dataSource.getRepository(CategoryEntity).save({
    userId: user.id,
    name: 'Food',
    kind: CategoryKind.Expense,
    archivedAt: null,
  });
  const keyPair = generateKeyPairSync('ed25519');
  const publicKey = (keyPair.publicKey.export({ type: 'spki', format: 'der' }) as Buffer)
    .subarray(-32)
    .toString('base64');
  await dataSource.getRepository(VaultKeyEntity).save({
    userId,
    publicKey,
    encryptedPrivateKey: {},
    keyVersion: 1,
  });

  const row = {
    sourceRow: 2,
    sourceRef: { kind: 'csv' as const, record: 2 },
    date: '2026-02-01',
    type: 'expense' as const,
    amount: 12.5,
    accountName: account.name,
    destinationAccountName: null,
    categoryName: category.name,
    note: 'Lunch',
    valid: true,
    errors: [],
    warnings: [],
  };
  const preview = {
    format: 'generic-csv',
    parserId: 'csv-header-map',
    parserVersion: '1.0.0',
    templateId: 'generic-csv-table',
    sourceSha256: 'a'.repeat(64),
    profileId: 'generic-csv',
    profileVersion: '1.0.0',
    profileDigest: 'b'.repeat(64),
    confidence: 1,
    total: 1,
    valid: 1,
    invalid: 0,
    reviewRequired: false,
    rows: [row],
  };
  const job = await dataSource.getRepository(ImportJobEntity).save({
    userId,
    fileName: 'statement.csv',
    filePath: '',
    sourceSha256: 'a'.repeat(64),
    status: ImportJobStatus.Preview,
    preview,
    createdCount: 0,
    skippedCount: 0,
  });
  const vault = new VaultService(
    dataSource.getRepository(VaultKeyEntity),
    dataSource.getRepository(VaultEventEntity),
    dataSource.getRepository(VaultChainHeadEntity),
    dataSource.getRepository(ImportJobEntity),
    dataSource.getRepository(AccountEntity),
    dataSource.getRepository(CategoryEntity),
  );
  const { claims } = await vault.prepareImportConfirmation(userId, job.id);
  const proofs = claims.map((claim) => {
    const fields = {
      claimDigest: claim.claimDigest,
      ciphertext: 'test-ciphertext',
      iv: 'dGVzdC1pdg==',
      authTag: 'dGVzdC10YWc=',
      keyVersion: 1,
    };
    return {
      sourceRow: claim.sourceRow,
      fingerprint: claim.fingerprint,
      payloadHash: claim.payloadHash,
      ciphertext: fields.ciphertext,
      iv: fields.iv,
      authTag: fields.authTag,
      keyVersion: fields.keyVersion,
      publicKeyId: publicKeyId(publicKey),
      signature: sign(null, Buffer.from(proofMessage(fields)), keyPair.privateKey).toString(
        'base64',
      ),
    };
  });
  return { userId, account, category, job, vault, proofs };
}
