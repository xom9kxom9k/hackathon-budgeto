import type { ImportProfile } from './types';
import { ImportError, ImportErrorCode } from '../import-errors';

const formats = new Set(['xlsx', 'csv', 'pdf']);
const layoutKinds = new Set(['table', 'pdf-lines']);
const previewFormats = new Set([
  'budgetto-xlsx',
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
  if (
    typeof value.version !== 'string' ||
    value.version.length > 32 ||
    !/^\d+\.\d+\.\d+$/.test(value.version)
  ) {
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
      value.match.requiredHeaders.length > 32 ||
      value.match.requiredHeaders.some(
        (group) =>
          !Array.isArray(group) ||
          group.length > 16 ||
          group.some((item) => typeof item !== 'string' || item.length > 128),
      ))
  ) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  if (
    value.match.textAnchors !== undefined &&
    (!Array.isArray(value.match.textAnchors) ||
      value.match.textAnchors.length > 32 ||
      value.match.textAnchors.some((item) => typeof item !== 'string' || item.length > 128))
  ) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }
  const hasDiscriminator =
    typeof value.match.previewFormat === 'string' ||
    value.match.requiredHeaders?.some((group: unknown[]) =>
      group.some((item: unknown) => typeof item === 'string' && item.trim().length > 0),
    ) === true ||
    value.match.textAnchors?.some((anchor) => anchor.trim().length > 0) === true;
  if (!hasDiscriminator) throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
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
        Object.keys(value.layout.columns).length <= 9 &&
        Object.keys(value.layout.columns).every((field) =>
          [
            'date',
            'type',
            'amount',
            'debit',
            'credit',
            'account',
            'destination',
            'category',
            'note',
          ].includes(field),
        ) &&
        Object.values(value.layout.columns).every(
          (aliases) =>
            Array.isArray(aliases) &&
            aliases.length <= 32 &&
            aliases.every((alias) => typeof alias === 'string' && alias.length <= 128),
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
      !['single-amount-only', 'signed-amount', 'first-amount', 'last-amount'].includes(
        value.layout.amountRule,
      ) ||
      (value.layout.recordRule !== undefined &&
        (typeof value.layout.recordRule !== 'string' ||
          !['same-line', 'date-block'].includes(value.layout.recordRule))) ||
      (value.layout.recordStartRule !== undefined &&
        (typeof value.layout.recordStartRule !== 'string' ||
          !['date', 'date-and-amount'].includes(value.layout.recordStartRule))) ||
      (value.layout.unsignedAmountType !== undefined &&
        (typeof value.layout.unsignedAmountType !== 'string' ||
          !['expense', 'income'].includes(value.layout.unsignedAmountType as string))) ||
      !['between-date-and-amount', 'after-amount'].includes(
        value.layout.descriptionRule as string,
      ) ||
      layoutKeys.some(
        (key) =>
          ![
            'kind',
            'amountRule',
            'descriptionRule',
            'recordRule',
            'recordStartRule',
            'unsignedAmountType',
          ].includes(key),
      ))
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
