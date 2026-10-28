import { parseDate, parseAmount, recountPreview, rowPreview } from './normalization';
import type { ParsedImportPreview } from './types';
import type { ImportProfile } from './profiles/types';
import { InvalidPdfError, PdfTextNotFoundError, PdfTooManyPagesError } from './import-errors';

const maxPages = 50;
const datePattern = /(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{4})/;
const amountPattern = /[-+]?(?:\d{1,3}(?:[\s\u00a0]\d{3})+|\d+)(?:[.,]\d{2})/g;

type PdfParser = (
  content: Buffer,
  options?: { max?: number },
) => Promise<{ numpages: number; text: string }>;

async function loadPdfParser(): Promise<PdfParser> {
  const module = await import('pdf-parse/lib/pdf-parse.js');
  return (module.default ?? module) as unknown as PdfParser;
}

type PdfLineRecord = { text: string; lineNumber: number };

function isDateLine(line: string): boolean {
  const dateMatch = datePattern.exec(line);
  return dateMatch !== null && parseDate(dateMatch[0]) !== null;
}

function splitPdfRecords(text: string, profile?: ImportProfile): PdfLineRecord[] {
  const lines = text.split(/\r?\n/);
  if (profile?.layout.kind !== 'pdf-lines' || profile.layout.recordRule !== 'date-block') {
    return lines.map((line, index) => ({ text: line, lineNumber: index + 1 }));
  }

  const records: PdfLineRecord[] = [];
  let pending: PdfLineRecord | null = null;
  lines.forEach((line, index) => {
    const normalized = line.trim();
    if (isDateLine(normalized)) {
      if (pending) records.push(pending);
      pending = { text: normalized, lineNumber: index + 1 };
    } else if (pending && normalized) {
      pending.text = `${pending.text} ${normalized}`;
    }
  });
  if (pending) records.push(pending);
  return records;
}

function lineToRow(
  line: string,
  sourceRow: number,
  page: number,
  record: number,
  profile?: ImportProfile,
) {
  const dateMatch = datePattern.exec(line);
  if (!dateMatch || !parseDate(dateMatch[0])) return null;
  const amountText = line.slice(dateMatch.index + dateMatch[0].length);
  const amounts = [...amountText.matchAll(amountPattern)];
  const amountRule =
    profile?.layout.kind === 'pdf-lines' ? profile.layout.amountRule : 'single-amount-only';
  const signedAmount = amounts.find((match) => /^[+-]/.test(match[0]));
  const signedAmountMissing = amountRule === 'signed-amount' && !signedAmount;
  const amountMatch =
    amountRule === 'signed-amount'
      ? (signedAmount ?? amounts.at(-1))
      : amountRule === 'first-amount'
        ? amounts[0]
        : amounts.at(-1);
  if (!amountMatch || amountMatch.index === undefined) return null;
  const rawAmount = amountMatch[0];
  const amount = parseAmount(rawAmount);
  if (amount === null || amount <= 0) return null;
  const description = amountText
    .slice(0, amountMatch.index)
    .replace(/^[|:\-\s]+|[|\-\s]+$/g, '')
    .trim();
  const type = rawAmount.startsWith('-')
    ? 'expense'
    : rawAmount.startsWith('+')
      ? 'income'
      : undefined;
  const row = rowPreview(
    [dateMatch[0], type ?? '', rawAmount, '', '', description],
    sourceRow,
    { kind: 'pdf', page, record },
    { date: 0, type: 1, amount: 2, account: 3, note: 5 },
    type,
  );
  if ((amountRule === 'single-amount-only' && amounts.length > 1) || signedAmountMissing) {
    row.errors.push('PDF_AMOUNT_AMBIGUOUS');
    row.valid = false;
  }
  return row;
}

export async function parsePdf(
  content: Buffer,
  sourceSha256?: string,
  profile?: ImportProfile,
  extracted?: { numpages: number; text: string },
): Promise<ParsedImportPreview> {
  if (!content.subarray(0, 5).toString('ascii').startsWith('%PDF-')) {
    throw new InvalidPdfError();
  }
  const parsed = extracted ?? (await extractPdfText(content));
  if (parsed.numpages > maxPages) throw new PdfTooManyPagesError();
  const rows = parsed.text.split('\f').flatMap((text, pageIndex) =>
    splitPdfRecords(text, profile)
      .map(({ text: line, lineNumber }) => lineToRow(line, 0, pageIndex + 1, lineNumber, profile))
      .filter((row): row is NonNullable<typeof row> => row !== null),
  );
  rows.forEach((row, index) => {
    row.sourceRow = index + 1;
  });
  if (!rows.length) throw new PdfTextNotFoundError();
  return recountPreview({
    format: 'generic-pdf' as const,
    parserId: 'pdf-text-table',
    parserVersion: '1.0.0',
    templateId: 'generic-pdf-text-table',
    confidence: Math.min(0.85, 0.45 + rows.length / 100),
    sourceSha256,
    rows,
  });
}

export async function extractPdfText(content: Buffer): Promise<{ numpages: number; text: string }> {
  if (!content.subarray(0, 5).toString('ascii').startsWith('%PDF-')) {
    throw new InvalidPdfError();
  }
  try {
    const parsed = await (await loadPdfParser())(content, { max: maxPages });
    if (parsed.numpages > maxPages) throw new PdfTooManyPagesError();
    return parsed;
  } catch (error) {
    if (error instanceof PdfTooManyPagesError) throw error;
    throw new InvalidPdfError(undefined, { cause: error });
  }
}
