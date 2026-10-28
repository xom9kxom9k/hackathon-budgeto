import { parseDate, parseAmount, recountPreview, rowPreview } from './normalization';
import type { ParsedImportPreview } from './types';

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

function lineToRow(line: string, sourceRow: number, page: number, record: number) {
  const dateMatch = datePattern.exec(line);
  if (!dateMatch || !parseDate(dateMatch[0])) return null;
  const amountText = line.slice(dateMatch.index + dateMatch[0].length);
  const amounts = [...amountText.matchAll(amountPattern)];
  const amountMatch = amounts.at(-1);
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
  if (amounts.length > 1) {
    row.errors.push('PDF_AMOUNT_AMBIGUOUS');
    row.valid = false;
  }
  return row;
}

export async function parsePdf(
  content: Buffer,
  sourceSha256?: string,
): Promise<ParsedImportPreview> {
  if (!content.subarray(0, 5).toString('ascii').startsWith('%PDF-')) {
    throw new Error('INVALID_PDF');
  }
  let parsed;
  try {
    parsed = await (await loadPdfParser())(content, { max: maxPages });
  } catch {
    throw new Error('INVALID_PDF');
  }
  if (parsed.numpages > maxPages) throw new Error('PDF_TOO_MANY_PAGES');
  const rows = parsed.text.split('\f').flatMap((text, pageIndex) =>
    text
      .split(/\r?\n/)
      .map((line, lineIndex) => lineToRow(line, 0, pageIndex + 1, lineIndex + 1))
      .filter((row): row is NonNullable<typeof row> => row !== null),
  );
  rows.forEach((row, index) => {
    row.sourceRow = index + 1;
  });
  if (!rows.length) throw new Error('PDF_TEXT_NOT_FOUND');
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
