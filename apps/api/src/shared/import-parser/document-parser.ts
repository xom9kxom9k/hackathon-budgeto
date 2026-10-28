import { createHash } from 'node:crypto';

import { parseCsv } from './csv-parser';
import { parsePdf } from './pdf-parser';
import type { ImportSourceKind, ParsedImportPreview } from './types';

const extensionPattern = /\.([a-z0-9]+)$/i;

export function detectImportFormat(fileName: string, content: Buffer): ImportSourceKind {
  const extension = extensionPattern.exec(fileName)?.[1]?.toLowerCase();
  const isPdf = content.subarray(0, 5).toString('ascii').startsWith('%PDF-');
  const isZip = content.subarray(0, 4).toString('ascii') === 'PK\u0003\u0004';
  if (isPdf) {
    if (extension !== 'pdf') throw new Error('IMPORT_FILE_SIGNATURE_MISMATCH');
    return 'pdf';
  }
  if (isZip) {
    if (extension !== 'xlsx' && extension !== 'xlsm') {
      throw new Error('IMPORT_FILE_SIGNATURE_MISMATCH');
    }
    return 'xlsx';
  }
  if (extension === 'csv') return 'csv';
  throw new Error('IMPORT_FILE_TYPE');
}

export async function parseImportDocument(
  content: Buffer,
  fileName: string,
): Promise<ParsedImportPreview> {
  const sourceSha256 = createHash('sha256').update(content).digest('hex');
  switch (detectImportFormat(fileName, content)) {
    case 'xlsx': {
      const { parseBudgetoXlsx } = await import('./xlsx-parser');
      return parseBudgetoXlsx(content, sourceSha256);
    }
    case 'csv': {
      return parseCsv(content, sourceSha256);
    }
    case 'pdf': {
      return parsePdf(content, sourceSha256);
    }
  }
}

export function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
