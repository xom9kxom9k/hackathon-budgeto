import { describe, expect, it } from 'vitest';

import {
  ImportError,
  ImportErrorCode,
  InvalidPdfError,
  InvalidXlsxError,
  PdfTextNotFoundError,
  PdfTooManyPagesError,
} from './import-errors';
import type { ImportProfile, ParsedImportPreview } from '@budgeto/contracts';

describe('shared import contracts', () => {
  it('keeps the runtime error contract available to API adapters', () => {
    const error = new ImportError(ImportErrorCode.INVALID_PDF);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(ImportErrorCode.INVALID_PDF);
  });

  it('exposes typed document errors while preserving stable error codes', () => {
    const errors = [
      new InvalidPdfError(),
      new PdfTooManyPagesError(),
      new PdfTextNotFoundError(),
      new InvalidXlsxError(),
    ];

    expect(errors).toEqual([
      expect.objectContaining({ code: ImportErrorCode.INVALID_PDF, name: 'InvalidPdfError' }),
      expect.objectContaining({
        code: ImportErrorCode.PDF_TOO_MANY_PAGES,
        name: 'PdfTooManyPagesError',
      }),
      expect.objectContaining({
        code: ImportErrorCode.PDF_TEXT_NOT_FOUND,
        name: 'PdfTextNotFoundError',
      }),
      expect.objectContaining({ code: ImportErrorCode.INVALID_XLSX, name: 'InvalidXlsxError' }),
    ]);
    for (const error of errors) expect(error).toBeInstanceOf(ImportError);
  });

  it('exposes document and profile types from the shared package', () => {
    const profile: ImportProfile = {
      id: 'compatibility-profile',
      version: '1.0.0',
      format: 'csv',
      match: {},
      layout: { kind: 'table', amountMode: 'signed' },
      review: { alwaysRequired: false, minConfidence: 0.8 },
    };
    const preview: ParsedImportPreview = {
      format: 'generic-csv',
      parserId: 'compatibility-test',
      parserVersion: '1.0.0',
      templateId: 'compatibility-test',
      confidence: 1,
      total: 0,
      valid: 0,
      invalid: 0,
      rows: [],
    };
    expect(profile.format).toBe(preview.format === 'generic-csv' ? 'csv' : 'xlsx');
  });
});
