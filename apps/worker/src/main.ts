import 'reflect-metadata';
import { Worker } from 'bullmq';
import { DataSource, IsNull } from 'typeorm';
import { readFile } from 'node:fs/promises';
import { parseImportDocument, sha256 } from '../../api/src/shared/import-parser/document-parser';
import { ImportError, ImportErrorCode } from '../../api/src/shared/import-parser/import-errors';
import { loadConfiguredImportProfiles } from '../../api/src/shared/import-parser/profiles/configuration';
import {
  assertImportStagingKey,
  decryptImportStaging,
} from '../../api/src/shared/import-staging-crypto';
import {
  ImportJobEntity,
  ImportJobStatus,
} from '../../api/src/modules/imports/entities/import-job.entity';
import { AccountEntity } from '../../api/src/modules/accounts/entities/account.entity';
import { CategoryEntity } from '../../api/src/modules/categories/entities/category.entity';
import { IMPORT_QUEUE } from '../../api/src/modules/imports/imports.queue';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgresql://budgetto:budgetto_dev@localhost:5432/budgetto',
  entities: [ImportJobEntity, AccountEntity, CategoryEntity],
  synchronize: false,
});

async function processJob(
  jobId: string,
  profiles: ReturnType<typeof loadConfiguredImportProfiles>,
): Promise<void> {
  const jobs = dataSource.getRepository(ImportJobEntity);
  const job = await jobs.findOneByOrFail({ id: jobId });
  await jobs.update(job.id, { status: ImportJobStatus.Parsing, errorCode: null });
  try {
    const content = decryptImportStaging(await readFile(job.filePath));
    if (!job.sourceSha256) {
      throw new ImportError(ImportErrorCode.IMPORT_SOURCE_HASH_REQUIRED);
    }
    if (sha256(content) !== job.sourceSha256) {
      throw new ImportError(ImportErrorCode.IMPORT_SOURCE_CHANGED);
    }
    const preview = await parseImportDocument(content, job.fileName, profiles);
    const [accounts, categories] = await Promise.all([
      dataSource
        .getRepository(AccountEntity)
        .find({ where: { userId: job.userId, archivedAt: IsNull() } }),
      dataSource
        .getRepository(CategoryEntity)
        .find({ where: { userId: job.userId, archivedAt: IsNull() } }),
    ]);
    const accountNames = new Set(
      accounts.map((account) => account.name.toLocaleLowerCase('ru-RU')),
    );
    const categoryNames = new Set(
      categories.map((category) => `${category.name.toLocaleLowerCase('ru-RU')}|${category.kind}`),
    );
    const rows = preview.rows.map((row) => {
      const errors = [...row.errors];
      if (row.accountName && !accountNames.has(row.accountName.toLocaleLowerCase('ru-RU')))
        errors.push('ACCOUNT_NOT_FOUND');
      if (
        row.type === 'transfer' &&
        row.destinationAccountName &&
        !accountNames.has(row.destinationAccountName.toLocaleLowerCase('ru-RU'))
      )
        errors.push('DESTINATION_NOT_FOUND');
      if (
        row.type !== 'transfer' &&
        row.categoryName &&
        !categoryNames.has(`${row.categoryName.toLocaleLowerCase('ru-RU')}|${row.type}`)
      )
        errors.push('CATEGORY_NOT_FOUND');
      return { ...row, errors, valid: errors.length === 0 };
    });
    const valid = rows.filter((row) => row.valid).length;
    await jobs.update(job.id, {
      status: ImportJobStatus.Preview,
      preview: { ...preview, rows, valid, invalid: rows.length - valid },
    });
  } catch (error) {
    await jobs.update(job.id, {
      status: ImportJobStatus.Failed,
      errorCode: error instanceof ImportError ? error.code : ImportErrorCode.IMPORT_PARSE_FAILED,
    });
  }
}

async function loadWorkerProfiles() {
  const profileFile = process.env.IMPORT_PROFILES_FILE;
  if (profileFile) return loadConfiguredImportProfiles(await readFile(profileFile, 'utf8'));
  return loadConfiguredImportProfiles();
}

async function main(): Promise<void> {
  assertImportStagingKey();
  const profiles = await loadWorkerProfiles();
  await dataSource.initialize();
  const worker = new Worker(IMPORT_QUEUE, async (job) => processJob(job.data.jobId, profiles), {
    connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
  });
  worker.on('error', (error) => console.error('Import worker error', error));
}
void main();
