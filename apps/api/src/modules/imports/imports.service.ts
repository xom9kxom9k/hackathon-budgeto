import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Workbook } from 'exceljs';
import { createImportQueue } from './imports.queue';
import { ImportJobEntity, ImportJobStatus } from './entities/import-job.entity';
import { AccountEntity } from '../accounts/entities/account.entity';
import { CategoryEntity, CategoryKind } from '../categories/entities/category.entity';
import { TransactionEntity, TransactionKind } from '../transactions/entities/transaction.entity';
import type { ParsedImportPreview, ParsedImportRow } from '../../shared/import-parser/types';
import { detectImportFormat, sha256 } from '../../shared/import-parser/document-parser';
import { ImportError, ImportErrorCode } from '../../shared/import-parser/import-errors';
import { assertImportStagingKey } from '../../shared/import-staging-crypto';
import { ImportStagingStore } from '../../shared/import-staging-store';
import type { VaultProofDto } from '../vault/vault.dto';
import { VaultService } from '../vault/vault.service';
import { VaultEventType } from '../vault/entities/vault-event.entity';
import { canonicalize, sha256 as sha256Text } from '../vault/vault.crypto';
import type { ImportEditableField, ImportRowEdit } from '../../shared/import-parser/types';

@Injectable()
export class ImportsService {
  private readonly staging = new ImportStagingStore();
  private readonly queue = createImportQueue();

  constructor(
    @InjectRepository(ImportJobEntity) private readonly jobs: Repository<ImportJobEntity>,
    @InjectRepository(AccountEntity) private readonly accounts: Repository<AccountEntity>,
    @InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
    private readonly dataSource: DataSource,
    private readonly vault: VaultService,
  ) {
    assertImportStagingKey();
  }

  async create(userId: string, fileName: string, content: Buffer): Promise<unknown> {
    if (!content.length) throw new ImportError(ImportErrorCode.IMPORT_FILE_EMPTY);
    if (content.length > 8 * 1024 * 1024)
      throw new ImportError(ImportErrorCode.IMPORT_FILE_TOO_LARGE);
    detectImportFormat(fileName, content);
    const filePath = await this.staging.write(content);
    const sourceSha256 = sha256(content);
    let job: ImportJobEntity | null = null;
    try {
      job = await this.jobs.save(
        this.jobs.create({
          userId,
          fileName,
          filePath,
          sourceSha256,
          status: ImportJobStatus.Queued,
        }),
      );
      await this.queue.add(
        'parse',
        { jobId: job.id },
        { removeOnComplete: true, removeOnFail: false },
      );
      return this.toView(job);
    } catch (error) {
      try {
        await this.staging.remove(filePath);
      } catch (cleanupError) {
        if (!(
          cleanupError &&
          typeof cleanupError === 'object' &&
          'code' in cleanupError &&
          cleanupError.code === 'ENOENT'
        )) {
          console.error('Import staging rollback cleanup failed', { filePath, cleanupError });
        }
      }
      if (job) {
        try {
          await this.jobs.remove(job);
        } catch (cleanupError) {
          console.error('Import job rollback cleanup failed', { jobId: job.id, cleanupError });
        }
      }
      throw error;
    }
  }

  async get(userId: string, jobId: string): Promise<ImportJobEntity> {
    const job = await this.jobs.findOne({ where: { id: jobId, userId } });
    if (!job) throw new NotFoundException('IMPORT_NOT_FOUND');
    return job;
  }

  async getView(userId: string, jobId: string): Promise<unknown> {
    return this.toView(await this.get(userId, jobId));
  }

  async list(userId: string): Promise<unknown[]> {
    const jobs = await this.jobs.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return jobs.map((job) => this.toView(job));
  }

  async retry(userId: string, jobId: string): Promise<unknown> {
    const job = await this.get(userId, jobId);
    if (
      job.status !== ImportJobStatus.Failed ||
      job.errorCode !== ImportErrorCode.IMPORT_PARSE_FAILED
    )
      throw new ImportError(ImportErrorCode.IMPORT_NOT_RETRYABLE);
    await this.staging.read(job.filePath);
    await this.jobs.update(job.id, { status: ImportJobStatus.Queued, errorCode: null });
    await this.queue.add(
      'parse',
      { jobId: job.id },
      { removeOnComplete: true, removeOnFail: false },
    );
    return this.toView(await this.get(userId, jobId));
  }

  async deleteStaging(userId: string, jobId: string): Promise<void> {
    const job = await this.get(userId, jobId);
    if (job.status !== ImportJobStatus.Failed && job.status !== ImportJobStatus.Confirmed) {
      throw new ImportError(ImportErrorCode.IMPORT_NOT_EDITABLE);
    }
    if (job.filePath) await this.removeStagingFile(job.filePath);
    await this.jobs.update(job.id, { filePath: '' });
  }

  async updateRows(userId: string, jobId: string, rows: ParsedImportRow[]): Promise<unknown> {
    const job = await this.get(userId, jobId);
    if (job.status !== ImportJobStatus.Preview)
      throw new ImportError(ImportErrorCode.IMPORT_NOT_EDITABLE);
    const preview = job.preview as ParsedImportPreview | null;
    if (!preview || rows.length !== preview.rows.length)
      throw new ImportError(ImportErrorCode.IMPORT_ROWS_CHANGED);
    const baseRows = preview.originalRows ?? preview.rows;
    const currentRows = new Map(preview.rows.map((row) => [row.sourceRow, row]));
    const submittedSourceRows = new Set(rows.map((row) => row.sourceRow));
    if (
      submittedSourceRows.size !== rows.length ||
      preview.rows.some((row) => !submittedSourceRows.has(row.sourceRow))
    ) {
      throw new ImportError(ImportErrorCode.IMPORT_ROWS_CHANGED);
    }
    const anchoredRows = rows.map((row) => {
      const current = currentRows.get(row.sourceRow);
      if (!current) throw new ImportError(ImportErrorCode.IMPORT_ROWS_CHANGED);
      return {
        ...row,
        sourceRow: current.sourceRow,
        sourceRef: current.sourceRef ?? { kind: 'xlsx', record: current.sourceRow },
      };
    });
    const editableFields: readonly ImportEditableField[] = [
      'date',
      'type',
      'amount',
      'accountName',
      'destinationAccountName',
      'categoryName',
      'note',
    ];
    const allRowsReviewed =
      anchoredRows.length > 0 &&
      anchoredRows.every((row) => {
        const current = currentRows.get(row.sourceRow)!;
        return editableFields.some((field) => row[field] !== current[field]);
      });
    const edits = anchoredRows
      .map((row) => this.createRowEdit(currentRows.get(row.sourceRow)!, row, editableFields))
      .filter((edit): edit is ImportRowEdit => edit !== null);
    const editLog = [...(preview.editLog ?? []), ...edits];
    const [accounts, categories] = await Promise.all([
      this.accounts.find({ where: { userId, archivedAt: IsNull() } }),
      this.categories.find({ where: { userId, archivedAt: IsNull() } }),
    ]);
    const checkedRows = anchoredRows.map((row) => {
      const checked = this.validateRow(row);
      const current = currentRows.get(row.sourceRow)!;
      if (current.errors.includes('PDF_AMOUNT_AMBIGUOUS') && row.amount === current.amount) {
        checked.errors.push('PDF_AMOUNT_AMBIGUOUS');
        checked.valid = false;
      }
      return checked;
    });
    const resolved = this.resolve(
      {
        ...preview,
        rows: checkedRows,
        ...(editLog.length ? { originalRows: baseRows, editLog } : {}),
      },
      accounts,
      categories,
    );
    if (resolved.reviewRequired && resolved.invalid === 0 && allRowsReviewed) {
      resolved.reviewRequired = false;
      resolved.reviewReasons = [];
    }
    await this.jobs.update(job.id, { preview: resolved });
    return this.toView(await this.get(userId, jobId));
  }

  async confirm(
    userId: string,
    jobId: string,
    proofs: VaultProofDto[] = [],
  ): Promise<{ created: number; skipped: number }> {
    const result = await this.dataSource.transaction(async (manager) => {
      const job = await manager
        .getRepository(ImportJobEntity)
        .createQueryBuilder('job')
        .setLock('pessimistic_write')
        .where('job.id = :jobId AND job.user_id = :userId', { jobId, userId })
        .getOne();
      if (!job) throw new NotFoundException('IMPORT_NOT_FOUND');
      if (job.status === ImportJobStatus.Confirmed) {
        return { created: job.createdCount, skipped: job.skippedCount };
      }
      if (job.status !== ImportJobStatus.Preview)
        throw new ImportError(ImportErrorCode.IMPORT_NOT_READY);
      const preview = job.preview as ParsedImportPreview | null;
      if (!preview || preview.invalid > 0)
        throw new ImportError(ImportErrorCode.IMPORT_HAS_INVALID_ROWS);
      if (preview.reviewRequired) throw new ImportError(ImportErrorCode.IMPORT_REVIEW_REQUIRED);
      const key = await this.vault.getKey(userId);
      if (!key) throw new ImportError(ImportErrorCode.VAULT_KEY_REQUIRED);
      const { claims } = await this.vault.prepareImportConfirmation(userId, jobId);
      if (proofs.length !== claims.length)
        throw new ImportError(ImportErrorCode.VAULT_PROOFS_REQUIRED);
      const validatedProofs = this.vault.validateProofs(
        claims,
        proofs,
        key.publicKey,
        key.keyVersion,
      );
      const proofByRow = new Map(validatedProofs.map((proof) => [proof.sourceRow, proof]));
      const transactions = manager.getRepository(TransactionEntity);
      const accounts = await manager
        .getRepository(AccountEntity)
        .find({ where: { userId, archivedAt: IsNull() } });
      const categories = await manager
        .getRepository(CategoryEntity)
        .find({ where: { userId, archivedAt: IsNull() } });
      const createdTransactions: Array<{
        transaction: TransactionEntity;
        proof: (typeof validatedProofs)[number];
        eventType: VaultEventType;
        operationId: string;
      }> = [];
      let created = 0;
      let skipped = 0;
      for (const row of preview.rows) {
        if (!row.valid || !row.type || !row.date || !row.amount || !row.accountName) continue;
        const account = accounts.find(
          (item) =>
            item.name.toLocaleLowerCase('ru-RU') === row.accountName!.toLocaleLowerCase('ru-RU'),
        );
        const destination = row.destinationAccountName
          ? accounts.find(
              (item) =>
                item.name.toLocaleLowerCase('ru-RU') ===
                row.destinationAccountName!.toLocaleLowerCase('ru-RU'),
            )
          : null;
        const category = row.categoryName
          ? categories.find(
              (item) =>
                item.name.toLocaleLowerCase('ru-RU') ===
                  row.categoryName!.toLocaleLowerCase('ru-RU') &&
                item.kind === (row.type === 'income' ? CategoryKind.Income : CategoryKind.Expense),
            )
          : null;
        if (
          !account ||
          (row.type === 'transfer' && !destination) ||
          (row.type !== 'transfer' && row.categoryName && !category)
        )
          throw new ImportError(ImportErrorCode.IMPORT_REFERENCE_INVALID);
        const proof = proofByRow.get(row.sourceRow);
        if (!proof) throw new ImportError(ImportErrorCode.VAULT_PROOF_INVALID);
        const fingerprint = proof.fingerprint;
        if (await transactions.exists({ where: { userId, fingerprint } })) {
          skipped += 1;
          continue;
        }
        const insertResult = await transactions
          .createQueryBuilder()
          .insert()
          .into(TransactionEntity)
          .values({
            userId,
            accountId: account.id,
            destinationAccountId: destination?.id ?? null,
            categoryId: category?.id ?? null,
            date: row.date,
            kind: row.type as TransactionKind,
            amount: row.amount.toFixed(2),
            note: row.note,
            fingerprint,
            importJobId: job.id,
            importRow: row.sourceRow,
          })
          .orIgnore()
          .execute();
        if (!insertResult.raw.length) {
          skipped += 1;
          continue;
        }
        const transaction = await transactions.findOneOrFail({
          where: { userId, fingerprint },
        });
        createdTransactions.push({
          transaction,
          proof,
          eventType: VaultEventType.TransactionConfirmed,
          operationId: proof.claim.operationId,
        });
        created += 1;
      }
      await this.vault.appendTransactionEvents(manager, userId, createdTransactions);
      await manager.getRepository(ImportJobEntity).update(job.id, {
        status: ImportJobStatus.Confirmed,
        confirmedAt: new Date(),
        createdCount: created,
        skippedCount: skipped,
      });
      return { created, skipped };
    });
    const confirmedJob = await this.get(userId, jobId);
    if (confirmedJob.filePath) {
      try {
        await this.removeStagingFile(confirmedJob.filePath);
        await this.jobs.update(confirmedJob.id, { filePath: '' });
      } catch (error) {
        console.error('Import staging cleanup failed', {
          jobId: confirmedJob.id,
          error,
        });
      }
    }
    return result;
  }

  private async removeStagingFile(filePath: string): Promise<void> {
    await this.staging.remove(filePath);
  }

  async template(): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Операции');
    sheet.addRow(['Дата', 'Тип', 'Сумма', 'Счёт', 'Счёт назначения', 'Категория', 'Заметка']);
    sheet.addRow([new Date(), 'Доход', 90000, 'Карта', '', 'Зарплата', 'Аванс']);
    sheet.addRow([new Date(), 'Расход', 1250.5, 'Карта', '', 'Еда', 'Магазин']);
    sheet.addRow([new Date(), 'Перевод', 10000, 'Карта', 'Наличные', '', 'Снятие']);
    const help = workbook.addWorksheet('Подсказка');
    help.addRows([
      ['Как заполнять'],
      ['Тип: Доход, Расход или Перевод.'],
      ['Счета и категории должны совпадать с названиями в Budgeto.'],
      ['После загрузки откроется preview, где строки можно исправить.'],
    ]);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private resolve(
    preview: ParsedImportPreview,
    accounts: AccountEntity[],
    categories: CategoryEntity[],
  ): ParsedImportPreview {
    const accountNames = new Set(
      accounts.map((account) => account.name.toLocaleLowerCase('ru-RU')),
    );
    const categoryNames = new Map(
      categories.map((category) => [
        `${category.name.toLocaleLowerCase('ru-RU')}|${category.kind}`,
        category,
      ]),
    );
    const rows = preview.rows.map((row) => {
      const errors = row.errors.filter((code) => code !== 'EDIT_REQUIRES_RECHECK');
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
    return this.recount({ ...preview, rows });
  }

  private recount(preview: ParsedImportPreview): ParsedImportPreview {
    const valid = preview.rows.filter((row) => row.valid).length;
    return { ...preview, total: preview.rows.length, valid, invalid: preview.rows.length - valid };
  }

  private validateRow(row: ParsedImportRow): ParsedImportRow {
    const errors = row.errors.filter((code) => code !== 'EDIT_REQUIRES_RECHECK');
    if (!row.date) errors.push('INVALID_DATE');
    if (!row.type) errors.push('UNKNOWN_TYPE');
    if (row.amount === null || row.amount <= 0) errors.push('INVALID_AMOUNT');
    if (!row.accountName) errors.push('ACCOUNT_REQUIRED');
    if (row.type === 'transfer') {
      if (!row.destinationAccountName) errors.push('DESTINATION_REQUIRED');
      if (
        row.accountName &&
        row.destinationAccountName &&
        row.accountName.toLocaleLowerCase('ru-RU') ===
          row.destinationAccountName.toLocaleLowerCase('ru-RU')
      )
        errors.push('TRANSFER_SAME_ACCOUNT');
    }
    return { ...row, errors, valid: errors.length === 0 };
  }

  private createRowEdit(
    before: ParsedImportRow,
    after: ParsedImportRow,
    editableFields: readonly ImportEditableField[],
  ): ImportRowEdit | null {
    const fields = editableFields.filter((field) => before[field] !== after[field]);
    if (!fields.length) return null;
    const beforeValues = Object.fromEntries(fields.map((field) => [field, before[field]]));
    const afterValues = Object.fromEntries(fields.map((field) => [field, after[field]]));
    const editHash = sha256Text(
      canonicalize({
        sourceRow: before.sourceRow,
        fields,
        before: beforeValues,
        after: afterValues,
      }),
    );
    return {
      sourceRow: before.sourceRow,
      fields: [...fields],
      before: beforeValues,
      after: afterValues,
      editHash,
    };
  }

  private toView(job: ImportJobEntity): unknown {
    return {
      id: job.id,
      fileName: job.fileName,
      status: job.status,
      preview: job.preview,
      errorCode: job.errorCode,
      createdAt: job.createdAt,
      confirmedAt: job.confirmedAt,
      rowCount: (job.preview as ParsedImportPreview | null)?.total ?? 0,
      created: job.status === ImportJobStatus.Confirmed ? job.createdCount : null,
      skipped: job.status === ImportJobStatus.Confirmed ? job.skippedCount : null,
    };
  }
}
