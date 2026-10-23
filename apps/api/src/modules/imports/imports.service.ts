import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DataSource, Repository } from 'typeorm';
import { Workbook } from 'exceljs';
import { createImportQueue } from './imports.queue';
import { ImportJobEntity, ImportJobStatus } from './entities/import-job.entity';
import { AccountEntity } from '../accounts/entities/account.entity';
import { CategoryEntity, CategoryKind } from '../categories/entities/category.entity';
import { TransactionEntity, TransactionKind } from '../transactions/entities/transaction.entity';
import type { ParsedImportPreview, ParsedImportRow } from '../../shared/import-parser/types';

@Injectable()
export class ImportsService {
  private readonly stagingDir =
    process.env.IMPORT_STAGING_DIR ?? join(process.cwd(), '.data', 'imports');
  private readonly queue = createImportQueue();

  constructor(
    @InjectRepository(ImportJobEntity) private readonly jobs: Repository<ImportJobEntity>,
    @InjectRepository(AccountEntity) private readonly accounts: Repository<AccountEntity>,
    @InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, fileName: string, content: Buffer): Promise<unknown> {
    if (!/\.(xlsx|xlsm)$/i.test(fileName)) throw new Error('IMPORT_FILE_TYPE');
    if (!content.length) throw new Error('IMPORT_FILE_EMPTY');
    if (content.length > 8 * 1024 * 1024) throw new Error('IMPORT_FILE_TOO_LARGE');
    await mkdir(this.stagingDir, { recursive: true });
    const filePath = join(this.stagingDir, `${randomUUID()}.xlsx`);
    await writeFile(filePath, content, { flag: 'wx' });
    const job = await this.jobs.save(
      this.jobs.create({ userId, fileName, filePath, status: ImportJobStatus.Queued }),
    );
    await this.queue.add(
      'parse',
      { jobId: job.id },
      { removeOnComplete: true, removeOnFail: false },
    );
    return this.toView(job);
  }

  async get(userId: string, jobId: string): Promise<ImportJobEntity> {
    const job = await this.jobs.findOne({ where: { id: jobId, userId } });
    if (!job) throw new NotFoundException('IMPORT_NOT_FOUND');
    return job;
  }

  async getView(userId: string, jobId: string): Promise<unknown> {
    return this.toView(await this.get(userId, jobId));
  }

  async updateRows(userId: string, jobId: string, rows: ParsedImportRow[]): Promise<unknown> {
    const job = await this.get(userId, jobId);
    if (job.status !== ImportJobStatus.Preview) throw new Error('IMPORT_NOT_EDITABLE');
    const [accounts, categories] = await Promise.all([
      this.accounts.find({ where: { userId } }),
      this.categories.find({ where: { userId } }),
    ]);
    const checkedRows = rows.map((row) => this.validateRow(row));
    const resolved = this.resolve(
      { ...(job.preview as ParsedImportPreview), rows: checkedRows },
      accounts,
      categories,
    );
    await this.jobs.update(job.id, { preview: resolved });
    return this.toView(await this.get(userId, jobId));
  }

  async confirm(userId: string, jobId: string): Promise<{ created: number; skipped: number }> {
    const job = await this.get(userId, jobId);
    if (job.status === ImportJobStatus.Confirmed) return { created: 0, skipped: 0 };
    const preview = job.preview as ParsedImportPreview | null;
    if (!preview || preview.invalid > 0) throw new Error('IMPORT_HAS_INVALID_ROWS');
    const result = await this.dataSource.transaction(async (manager) => {
      const transactions = manager.getRepository(TransactionEntity);
      let created = 0;
      let skipped = 0;
      for (const row of preview.rows) {
        if (!row.valid || !row.type || !row.date || !row.amount || !row.accountName) continue;
        const account = await this.accounts.findOne({ where: { userId, name: row.accountName } });
        const destination = row.destinationAccountName
          ? await this.accounts.findOne({ where: { userId, name: row.destinationAccountName } })
          : null;
        const category = row.categoryName
          ? await this.categories.findOne({
              where: {
                userId,
                name: row.categoryName,
                kind: row.type === 'income' ? CategoryKind.Income : CategoryKind.Expense,
              },
            })
          : null;
        if (
          !account ||
          (row.type === 'transfer' && !destination) ||
          (row.type !== 'transfer' && row.categoryName && !category)
        )
          throw new Error('IMPORT_REFERENCE_INVALID');
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
        if (await transactions.exists({ where: { userId, fingerprint } })) {
          skipped += 1;
          continue;
        }
        await transactions.save(
          transactions.create({
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
          }),
        );
        created += 1;
      }
      await manager.getRepository(ImportJobEntity).update(job.id, {
        status: ImportJobStatus.Confirmed,
        confirmedAt: new Date(),
      });
      return { created, skipped };
    });
    await unlink(job.filePath).catch(() => undefined);
    return result;
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

  private toView(job: ImportJobEntity): unknown {
    return {
      id: job.id,
      fileName: job.fileName,
      status: job.status,
      preview: job.preview,
      errorCode: job.errorCode,
    };
  }
}
