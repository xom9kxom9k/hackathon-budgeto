import { createHash } from 'node:crypto';

import { extractCsvHeaders, parseCsv } from './csv-parser';
import { extractPdfText, parsePdf } from './pdf-parser';
import { ImportError, ImportErrorCode } from './import-errors';
import {
  classifyImportProfile,
  createImportProfileRegistry,
  digestImportProfile,
  listImportProfiles,
} from './profiles/registry';
import type { ImportProfile } from './profiles/types';
import type { ImportSourceKind, ParsedImportPreview } from './types';

const extensionPattern = /\.([a-z0-9]+)$/i;

export function detectImportFormat(fileName: string, content: Buffer): ImportSourceKind {
  const extension = extensionPattern.exec(fileName)?.[1]?.toLowerCase();
  const isPdf = content.subarray(0, 5).toString('ascii').startsWith('%PDF-');
  const isZip = content.subarray(0, 4).toString('ascii') === 'PK\u0003\u0004';
  if (isPdf) {
    if (extension !== 'pdf') throw new ImportError(ImportErrorCode.IMPORT_FILE_SIGNATURE_MISMATCH);
    return 'pdf';
  }
  if (isZip) {
    if (extension !== 'xlsx' && extension !== 'xlsm') {
      throw new ImportError(ImportErrorCode.IMPORT_FILE_SIGNATURE_MISMATCH);
    }
    return 'xlsx';
  }
  if (extension === 'csv') return 'csv';
  throw new ImportError(ImportErrorCode.IMPORT_FILE_TYPE);
}

export async function parseImportDocument(
  content: Buffer,
  fileName: string,
  profiles: readonly ImportProfile[] = listImportProfiles(),
): Promise<ParsedImportPreview> {
  const sourceSha256 = createHash('sha256').update(content).digest('hex');
  const sourceKind = detectImportFormat(fileName, content);
  const profileRegistry = createImportProfileRegistry(profiles);
  let preview: ParsedImportPreview;
  let selection;
  switch (sourceKind) {
    case 'xlsx': {
      const { extractXlsxHeaders, parseBudgettoXlsx } = await import('./xlsx-parser');
      const customProfiles = profileRegistry.filter(
        (profile) => profile.format === 'xlsx' && !profile.match.previewFormat,
      );
      if (customProfiles.length) {
        const headers = await extractXlsxHeaders(content);
        let defaultPreview: ParsedImportPreview | null = null;
        try {
          defaultPreview = await parseBudgettoXlsx(content, sourceSha256);
        } catch (error) {
          if (
            !(error instanceof ImportError) ||
            error.code !== ImportErrorCode.IMPORT_HEADERS_NOT_FOUND
          ) {
            throw error;
          }
        }
        selection = classifyImportProfile(
          {
            format: sourceKind,
            headers,
            previewFormat: defaultPreview?.format,
          },
          profileRegistry,
        );
        preview = await parseBudgettoXlsx(content, sourceSha256, selection.profile);
      } else {
        preview = await parseBudgettoXlsx(content, sourceSha256);
        selection = classifyImportProfile(
          { format: sourceKind, previewFormat: preview.format },
          profileRegistry,
        );
      }
      break;
    }
    case 'csv': {
      const delimiterHints = profileRegistry
        .filter(
          (profile) =>
            profile.format === 'csv' && profile.layout.kind === 'table' && profile.layout.delimiter,
        )
        .map((profile) => (profile.layout.kind === 'table' ? profile.layout.delimiter : undefined))
        .filter((delimiter): delimiter is ',' | ';' | '\t' => delimiter !== undefined);
      const delimiters = [...new Set([...delimiterHints, undefined])];
      const selections = [];
      let lastError: unknown;
      for (const preferredDelimiter of delimiters) {
        try {
          const headers = extractCsvHeaders(content, preferredDelimiter);
          selections.push(classifyImportProfile({ format: sourceKind, headers }, profileRegistry));
        } catch (error) {
          lastError = error;
        }
      }
      if (!selections.length) throw lastError;
      selection = selections.sort(
        (left, right) =>
          right.confidence - left.confidence || left.profile.id.localeCompare(right.profile.id),
      )[0];
      preview = parseCsv(content, sourceSha256, selection.profile);
      break;
    }
    case 'pdf': {
      const extracted = await extractPdfText(content);
      selection = classifyImportProfile(
        { format: sourceKind, sampleText: extracted.text.slice(0, 64 * 1024) },
        profileRegistry,
      );
      preview = await parsePdf(content, sourceSha256, selection.profile, extracted);
      break;
    }
  }
  return {
    ...preview,
    profileId: selection.profile.id,
    profileVersion: selection.profile.version,
    profileDigest: digestImportProfile(selection.profile),
    reviewRequired: selection.reviewRequired,
    reviewReasons: selection.reviewReasons,
    classifierConfidence: selection.confidence,
  };
}

export function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
