import type {
  ImportIssueCode,
  ImportSourceRef,
  ImportTransactionType,
  ParsedImportRow,
} from './types';

export const aliases: Record<string, string[]> = {
  date: ['дата', 'date', 'день', 'дата операции', 'operation date', 'transaction date'],
  type: ['тип', 'type', 'вид', 'operation', 'операция'],
  amount: ['сумма', 'amount', 'сумма операции', 'value', 'сумма в валюте операции'],
  debit: ['дебет', 'debit', 'расход', 'списание'],
  credit: ['кредит', 'credit', 'доход', 'пополнение'],
  account: ['счёт', 'счет', 'account', 'счёт списания', 'счет списания', 'account name'],
  destination: [
    'счёт назначения',
    'счет назначения',
    'счёт пополнения',
    'счет пополнения',
    'to_account',
    'куда',
    'destination account',
  ],
  category: ['категория', 'category', 'категория операции'],
  note: [
    'заметка',
    'note',
    'комментарий',
    'описание',
    'назначение',
    'description',
    'details',
    'merchant',
  ],
};

export const typeAliases: Record<string, ImportTransactionType> = {
  доход: 'income',
  income: 'income',
  credit: 'income',
  пополнение: 'income',
  расход: 'expense',
  expense: 'expense',
  debit: 'expense',
  списание: 'expense',
  перевод: 'transfer',
  transfer: 'transfer',
};

export const normalize = (value: unknown): string =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

export const key = (value: unknown): string => normalize(value).toLocaleLowerCase('ru-RU');

export function parseDate(value: unknown): string | null {
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

export function parseAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.abs(value);
  const raw = normalize(value)
    .replace(/[\s\u00a0]/g, '')
    .replace(/[^\d,.-]/g, '');
  if (!raw) return null;
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  let text = raw;
  if (lastComma >= 0 && lastDot >= 0) {
    text = lastComma > lastDot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  } else if (lastComma >= 0) {
    text = raw.replace(',', '.');
  } else if ((raw.match(/\./g) ?? []).length > 1) {
    const parts = raw.split('.');
    text =
      parts.at(-1)?.length === 2
        ? `${parts.slice(0, -1).join('')}.${parts.at(-1)}`
        : parts.join('');
  }
  const amount = Number(text);
  return Number.isFinite(amount) ? Math.abs(amount) : null;
}

export function headerMap(row: unknown[]): Record<string, number> {
  const result: Record<string, number> = {};
  row.forEach((cell, index) => {
    const normalized = key(cell);
    for (const [field, names] of Object.entries(aliases)) {
      if (names.includes(normalized) && result[field] === undefined) result[field] = index;
    }
  });
  return result;
}

export function rowPreview(
  row: unknown[],
  sourceRow: number,
  sourceRef: ImportSourceRef,
  columns: Record<string, number>,
  fixedType?: ImportTransactionType,
): ParsedImportRow {
  const errors: ImportIssueCode[] = [];
  const warnings: ImportIssueCode[] = [];
  const cell = (field: string): unknown => {
    const index = columns[field];
    return index === undefined ? undefined : row[index];
  };
  const date = parseDate(cell('date'));
  const type = fixedType ?? typeAliases[key(cell('type'))] ?? null;
  const amount = parseAmount(cell('amount'));
  const accountName = normalize(cell('account')) || null;
  const destinationAccountName = normalize(cell('destination')) || null;
  const categoryName = normalize(cell('category')) || null;
  const note = normalize(cell('note')) || null;
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

export function isEmpty(row: unknown[]): boolean {
  return row.every((value) => normalize(value) === '');
}

export function recountPreview<T extends { rows: ParsedImportRow[] }>(
  preview: T,
): T & {
  total: number;
  valid: number;
  invalid: number;
} {
  const valid = preview.rows.filter((row) => row.valid).length;
  return { ...preview, total: preview.rows.length, valid, invalid: preview.rows.length - valid };
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
  'PDF_AMOUNT_AMBIGUOUS',
  'PDF_TEXT_NOT_FOUND',
];
