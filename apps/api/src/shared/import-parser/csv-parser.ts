import type { ImportTransactionType, ParsedImportPreview } from './types';
import type { ImportProfile } from './profiles/types';
import { ImportError, ImportErrorCode } from './import-errors';
import {
  aliases,
  headerMap,
  isEmpty,
  key,
  normalize,
  parseAmount,
  recountPreview,
  rowPreview,
  typeAliases,
} from './normalization';

const delimiters = [',', ';', '\t'] as const;
type CsvRecord = { values: string[]; sourceRow: number };

function countDelimiter(line: string, delimiter: string): number {
  let quoted = false;
  let count = 0;
  for (const character of line) {
    if (character === '"') quoted = !quoted;
    else if (!quoted && character === delimiter) count += 1;
  }
  return count;
}

function detectDelimiter(text: string, preferred?: string): string {
  if (preferred) return preferred;
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const ranked = delimiters
    .map((delimiter) => ({ delimiter, count: countDelimiter(firstLine, delimiter) }))
    .sort((left, right) => right.count - left.count);
  if (!ranked[0]?.count) throw new ImportError(ImportErrorCode.CSV_DELIMITER_NOT_FOUND);
  if (ranked[0].count === ranked[1]?.count && ranked[0].count > 0) {
    throw new ImportError(ImportErrorCode.CSV_DELIMITER_AMBIGUOUS);
  }
  return ranked[0].delimiter;
}

function parseRecords(text: string, delimiter: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let record: string[] = [];
  let value = '';
  let quoted = false;
  let sourceRow = 1;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && character === delimiter) {
      record.push(value);
      value = '';
      continue;
    }
    if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && next === '\n') index += 1;
      record.push(value);
      value = '';
      if (record.some((cell) => normalize(cell) !== ''))
        records.push({ values: record, sourceRow });
      record = [];
      sourceRow += 1;
      continue;
    }
    value += character;
  }
  if (quoted) throw new ImportError(ImportErrorCode.CSV_QUOTE_NOT_CLOSED);
  record.push(value);
  if (record.some((cell) => normalize(cell) !== '')) records.push({ values: record, sourceRow });
  return records;
}

function inferType(
  row: string[],
  columns: Record<string, number>,
  amountMode: 'signed' | 'debit-credit',
): ImportTransactionType | undefined {
  const type = typeAliases[key(row[columns.type ?? -1])];
  if (type) return type;
  if (amountMode === 'signed') {
    const amount = columns.amount === undefined ? '' : normalize(row[columns.amount]);
    if (amount) return /^-/.test(amount) ? 'expense' : 'income';
  }
  const debit = columns.debit === undefined ? '' : normalize(row[columns.debit]);
  const credit = columns.credit === undefined ? '' : normalize(row[columns.credit]);
  if (parseAmount(debit) !== null && parseAmount(debit)! > 0) return 'expense';
  if (parseAmount(credit) !== null && parseAmount(credit)! > 0) return 'income';
  const amount = columns.amount === undefined ? '' : normalize(row[columns.amount]);
  if (amount) return /^-/.test(amount) ? 'expense' : 'income';
  return undefined;
}

function amountValue(
  row: string[],
  columns: Record<string, number>,
  amountMode: 'signed' | 'debit-credit',
): string | null {
  if (columns.amount !== undefined) return row[columns.amount] ?? null;
  if (amountMode === 'signed') return null;
  const debit = columns.debit === undefined ? '' : normalize(row[columns.debit]);
  const credit = columns.credit === undefined ? '' : normalize(row[columns.credit]);
  return parseAmount(debit) !== null && parseAmount(debit)! > 0
    ? debit
    : parseAmount(credit) !== null && parseAmount(credit)! > 0
      ? credit
      : null;
}

export function extractCsvHeaders(content: Buffer, preferredDelimiter?: string): string[] {
  const text = content.toString('utf8').replace(/^\uFEFF/, '');
  const records = parseRecords(text, detectDelimiter(text, preferredDelimiter));
  const header = records.find(({ values }) => {
    const columns = headerMap(values);
    return (
      columns.date !== undefined &&
      (columns.amount !== undefined || columns.debit !== undefined || columns.credit !== undefined)
    );
  });
  return header?.values ?? records.find(({ values }) => values.length > 1)?.values ?? [];
}

export function parseCsv(
  content: Buffer,
  sourceSha256?: string,
  profile?: ImportProfile,
): ParsedImportPreview {
  const text = content.toString('utf8').replace(/^\uFEFF/, '');
  if (!text.trim()) throw new ImportError(ImportErrorCode.IMPORT_FILE_EMPTY);
  if (text.length > 16 * 1024 * 1024) throw new ImportError(ImportErrorCode.CSV_TEXT_TOO_LARGE);
  const tableLayout = profile?.layout.kind === 'table' ? profile.layout : undefined;
  const amountMode = tableLayout?.amountMode ?? 'debit-credit';
  const fieldAliases = tableLayout?.columns ? { ...aliases, ...tableLayout.columns } : aliases;
  const delimiter = detectDelimiter(text, tableLayout?.delimiter);
  const records = parseRecords(text, delimiter);
  const headerIndex = records.findIndex(({ values }) => {
    const columns = headerMap(values, fieldAliases);
    return (
      columns.date !== undefined &&
      (columns.amount !== undefined || columns.debit !== undefined || columns.credit !== undefined)
    );
  });
  if (headerIndex < 0) throw new ImportError(ImportErrorCode.IMPORT_HEADERS_NOT_FOUND);
  const headers = records[headerIndex].values;
  const sourceColumns = headerMap(headers, fieldAliases);
  const columns =
    sourceColumns.amount === undefined
      ? { ...sourceColumns, amount: headers.length }
      : sourceColumns;
  const rows = records
    .slice(headerIndex + 1)
    .filter(({ values }) => !isEmpty(values))
    .map(({ values, sourceRow }) => {
      const row = [...values];
      row[columns.amount] = amountValue(values, sourceColumns, amountMode) ?? '';
      const type = inferType(values, sourceColumns, amountMode);
      return rowPreview(row, sourceRow, { kind: 'csv', record: sourceRow }, columns, type);
    });
  return recountPreview({
    format: 'generic-csv',
    parserId: 'csv-header-map',
    parserVersion: '1.0.0',
    templateId: 'generic-csv-table',
    confidence: rows.length ? 0.9 : 0.45,
    sourceSha256,
    rows,
  });
}
