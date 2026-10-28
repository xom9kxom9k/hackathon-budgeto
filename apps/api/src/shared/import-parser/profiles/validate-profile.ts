import type { ImportProfile } from './types';
import { ImportError, ImportErrorCode } from '../import-errors';

const formats = new Set(['xlsx', 'csv', 'pdf']);
const layoutKinds = new Set(['table', 'pdf-lines']);
const previewFormats = new Set([
  'budgeto-xlsx',
  'finance-export-xlsx',
  'generic-csv',
  'generic-pdf',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateImportProfile(value: unknown): ImportProfile {
  if (!isRecord(value)) throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  if (typeof value.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,63}$/.test(value.id)) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  if (typeof value.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(value.version)) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  if (typeof value.format !== 'string' || !formats.has(value.format)) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  if (!isRecord(value.match) || !isRecord(value.layout) || !isRecord(value.review)) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  const matchKeys = Object.keys(value.match);
  if (matchKeys.some((key) => !['previewFormat', 'requiredHeaders', 'textAnchors'].includes(key))) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_UNSAFE);
  }
  if (
    value.match.previewFormat !== undefined &&
    (typeof value.match.previewFormat !== 'string' ||
      !previewFormats.has(value.match.previewFormat) ||
      (value.format === 'pdf' && value.match.previewFormat !== 'generic-pdf') ||
      (value.format === 'csv' && value.match.previewFormat !== 'generic-csv') ||
      (value.format === 'xlsx' && !value.match.previewFormat.endsWith('xlsx')))
  ) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  if (
    value.match.requiredHeaders !== undefined &&
    (!Array.isArray(value.match.requiredHeaders) ||
      value.match.requiredHeaders.some(
        (group) => !Array.isArray(group) || group.some((item) => typeof item !== 'string'),
      ))
  ) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  if (
    value.match.textAnchors !== undefined &&
    (!Array.isArray(value.match.textAnchors) ||
      value.match.textAnchors.some((item) => typeof item !== 'string'))
  ) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  if (typeof value.layout.kind !== 'string' || !layoutKinds.has(value.layout.kind)) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  const layoutKeys = Object.keys(value.layout);
  if (value.format === 'pdf' && value.layout.kind !== 'pdf-lines') {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  if (value.format !== 'pdf' && value.layout.kind !== 'table') {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  if (value.layout.kind === 'table') {
    const hasValidAmountMode =
      typeof value.layout.amountMode === 'string' &&
      ['signed', 'debit-credit'].includes(value.layout.amountMode);
    const hasValidDelimiter =
      value.layout.delimiter === undefined ||
      (typeof value.layout.delimiter === 'string' &&
        [',', ';', '\t'].includes(value.layout.delimiter));
    const hasValidColumns =
      value.layout.columns === undefined ||
      (isRecord(value.layout.columns) &&
        Object.values(value.layout.columns).every(
          (aliases) =>
            Array.isArray(aliases) && aliases.every((alias) => typeof alias === 'string'),
        ));
    if (
      !hasValidAmountMode ||
      !hasValidDelimiter ||
      !hasValidColumns ||
      layoutKeys.some((key) => !['kind', 'amountMode', 'delimiter', 'columns'].includes(key))
    ) {
      throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
    }
  }
  if (
    value.layout.kind === 'pdf-lines' &&
    (typeof value.layout.amountRule !== 'string' ||
      !['single-amount-only', 'signed-amount'].includes(value.layout.amountRule) ||
      value.layout.descriptionRule !== 'between-date-and-amount' ||
      layoutKeys.some((key) => !['kind', 'amountRule', 'descriptionRule'].includes(key)))
  ) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  if (Object.keys(value.review).some((key) => !['alwaysRequired', 'minConfidence'].includes(key))) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_UNSAFE);
  }
  if (
    typeof value.review.alwaysRequired !== 'boolean' ||
    typeof value.review.minConfidence !== 'number' ||
    value.review.minConfidence < 0 ||
    value.review.minConfidence > 1
  ) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  return value as unknown as ImportProfile;
}
