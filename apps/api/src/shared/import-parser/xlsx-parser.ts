import { Workbook } from 'exceljs';

import type {
  ImportIssueCode,
  ImportSourceRef,
  ImportTransactionType,
  ParsedImportPreview,
  ParsedImportRow,
} from './types';
import type { ImportProfile } from './profiles/types';
import { ImportError, ImportErrorCode, InvalidXlsxError } from './import-errors';

const aliases: Record<string, string[]> = {
  date: ['дата', 'date', 'день'],
  type: ['тип', 'type', 'вид'],
  amount: ['сумма', 'amount', 'сумма операции'],
  account: ['счёт', 'счет', 'account', 'счёт списания', 'счет списания'],
  destination: [
    'счёт назначения',
    'счет назначения',
    'счёт пополнения',
    'счет пополнения',
    'to_account',
    'куда',
  ],
  category: ['категория', 'category'],
  note: ['заметка', 'note', 'комментарий', 'описание', 'назначение'],
};

const typeAliases: Record<string, ImportTransactionType> = {
  доход: 'income',
  income: 'income',
  расход: 'expense',
  expense: 'expense',
  перевод: 'transfer',
  transfer: 'transfer',
};

const financeSheets: Record<string, { type: ImportTransactionType; required: string[] }> = {
  расходы: { type: 'expense', required: ['date', 'category', 'account', 'amount'] },
  доходы: { type: 'income', required: ['date', 'category', 'account', 'amount'] },
  переводы: { type: 'transfer', required: ['date', 'account', 'destination', 'amount'] },
};

const normalize = (value: unknown): string =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const key = (value: unknown): string => normalize(value).toLocaleLowerCase('ru-RU');

function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  const text = normalize(value);
  const match =
    /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text) ??
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text);
  if (!match) return null;
  const [first, second, third] = match.slice(1).map(Number);
  const [year, month, day] =
    match[1].length === 4 ? [first, second, third] : [third, second, first];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.abs(value);
  const text = normalize(value)
    .replace(/[\s\u00a0]/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const amount = Number(text);
  return text && Number.isFinite(amount) ? Math.abs(amount) : null;
}

function headerMap(
  row: unknown[],
  fieldAliases: Record<string, string[]> = aliases,
): Record<string, number> {
  const result: Record<string, number> = {};
  row.forEach((cell, index) => {
    const normalized = key(cell);
    for (const [field, names] of Object.entries(fieldAliases)) {
      if (names.includes(normalized) && result[field] === undefined) result[field] = index;
    }
  });
  return result;
}

function cell(row: unknown[], columns: Record<string, number>, field: string): unknown {
  const index = columns[field];
  return index === undefined ? undefined : row[index];
}

function rowPreview(
  row: unknown[],
  sourceRow: number,
  sourceRef: ImportSourceRef,
  columns: Record<string, number>,
  fixedType?: ImportTransactionType,
  amountMode: 'signed' | 'debit-credit' = 'debit-credit',
): ParsedImportRow {
  const errors: ImportIssueCode[] = [];
  const warnings: ImportIssueCode[] = [];
  const date = parseDate(cell(row, columns, 'date'));
  const rawAmount = normalize(cell(row, columns, 'amount'));
  const type =
    fixedType ??
    typeAliases[key(cell(row, columns, 'type'))] ??
    (amountMode === 'signed' && rawAmount
      ? rawAmount.startsWith('-')
        ? 'expense'
        : 'income'
      : null);
  const amount = parseAmount(cell(row, columns, 'amount'));
  const accountName = normalize(cell(row, columns, 'account')) || null;
  const destinationAccountName = normalize(cell(row, columns, 'destination')) || null;
  const categoryName = normalize(cell(row, columns, 'category')) || null;
  const note = normalize(cell(row, columns, 'note')) || null;
  if (!date) errors.push('INVALID_DATE');
  if (!type) errors.push('UNKNOWN_TYPE');
  if (amount === null || amount <= 0) errors.push('INVALID_AMOUNT');
  if (!accountName) errors.push('ACCOUNT_REQUIRED');
  if (type === 'transfer') {
    if (!destinationAccountName) errors.push('DESTINATION_REQUIRED');
    if (accountName && destinationAccountName && key(accountName) === key(destinationAccountName))
      errors.push('TRANSFER_SAME_ACCOUNT');
    if (categoryName) warnings.push('TRANSFER_CATEGORY_IGNORED');
  } else if (destinationAccountName) warnings.push('DESTINATION_ONLY_FOR_TRANSFER');
  return {
    sourceRow,
    sourceRef,
    date,
    type,
    amount,
    accountName,
    destinationAccountName,
    categoryName,
    note,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function isEmpty(row: unknown[]): boolean {
  return row.every((value) => normalize(value) === '');
}

export async function parseBudgettoXlsx(
  content: Buffer,
  sourceSha256?: string,
  profile?: ImportProfile,
): Promise<ParsedImportPreview> {
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(content as never);
  } catch {
    throw new InvalidXlsxError();
  }
  const finance = workbook.worksheets.some((sheet) => financeSheets[key(sheet.name)]);
  const tableLayout = profile?.layout.kind === 'table' ? profile.layout : undefined;
  const amountMode = tableLayout?.amountMode ?? 'debit-credit';
  const fieldAliases = tableLayout?.columns ? { ...aliases, ...tableLayout.columns } : aliases;
  const rows: ParsedImportRow[] = [];
  if (finance) {
    for (const sheet of workbook.worksheets) {
      const config = financeSheets[key(sheet.name)];
      if (!config) continue;
      let columns: Record<string, number> | null = null;
      let headerRow = 0;
      for (let index = 1; index <= Math.min(10, sheet.rowCount); index += 1) {
        const candidate = headerMap(sheet.getRow(index).values as unknown[], fieldAliases);
        if (config.required.every((field) => candidate[field] !== undefined)) {
          columns = candidate;
          headerRow = index;
          break;
        }
      }
      if (!columns) continue;
      for (let index = headerRow + 1; index <= sheet.rowCount; index += 1) {
        const values = sheet.getRow(index).values as unknown[];
        if (!isEmpty(values)) {
          rows.push(
            rowPreview(
              values,
              rows.length + 1,
              { kind: 'xlsx', sheet: sheet.name, record: index },
              columns,
              config.type,
              amountMode,
            ),
          );
        }
      }
    }
  } else {
    let sheet = workbook.worksheets[0];
    let columns: Record<string, number> | null = null;
    let headerRow = 0;
    for (const candidateSheet of workbook.worksheets) {
      for (let index = 1; index <= Math.min(30, candidateSheet.rowCount); index += 1) {
        const candidate = headerMap(candidateSheet.getRow(index).values as unknown[], fieldAliases);
        const requiredFields = ['date', 'amount', 'account'];
        if (amountMode !== 'signed') requiredFields.push('type');
        if (requiredFields.every((field) => candidate[field] !== undefined)) {
          sheet = candidateSheet;
          columns = candidate;
          headerRow = index;
          break;
        }
      }
      if (columns) break;
    }
    if (!columns) throw new ImportError(ImportErrorCode.IMPORT_HEADERS_NOT_FOUND);
    for (let index = headerRow + 1; index <= sheet.rowCount; index += 1) {
      const values = sheet.getRow(index).values as unknown[];
      if (!isEmpty(values)) {
        rows.push(
          rowPreview(
            values,
            rows.length + 1,
            { kind: 'xlsx', sheet: sheet.name, record: index },
            columns,
            undefined,
            amountMode,
          ),
        );
      }
    }
  }
  const valid = rows.filter((row) => row.valid).length;
  return {
    format: finance ? 'finance-export-xlsx' : 'budgetto-xlsx',
    parserId: 'xlsx-header-map',
    parserVersion: '1.0.0',
    templateId: finance ? 'budgetto-finance-sheets' : 'generic-xlsx-table',
    confidence: rows.length ? 0.98 : 0.5,
    sourceSha256,
    total: rows.length,
    valid,
    invalid: rows.length - valid,
    rows,
  };
}

export async function extractXlsxHeaders(content: Buffer): Promise<string[]> {
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(content as never);
  } catch {
    throw new InvalidXlsxError();
  }
  let best: string[] = [];
  for (const sheet of workbook.worksheets) {
    for (let index = 1; index <= Math.min(30, sheet.rowCount); index += 1) {
      const values = (sheet.getRow(index).values as unknown[]).map(normalize).filter(Boolean);
      if (values.length > best.length) best = values;
    }
  }
  return best;
}

export const importIssueCodes: ImportIssueCode[] = [
  'INVALID_DATE',
  'UNKNOWN_TYPE',
  'INVALID_AMOUNT',
  'ACCOUNT_REQUIRED',
  'ACCOUNT_NOT_FOUND',
  'DESTINATION_REQUIRED',
  'DESTINATION_NOT_FOUND',
  'TRANSFER_SAME_ACCOUNT',
  'CATEGORY_NOT_FOUND',
  'CATEGORY_TYPE_MISMATCH',
  'TRANSFER_CATEGORY_IGNORED',
  'DESTINATION_ONLY_FOR_TRANSFER',
];
