import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { detectImportFormat, parseImportDocument } from './document-parser';
import { ImportError, ImportErrorCode } from './import-errors';
import { extractPdfText, parsePdf } from './pdf-parser';

const signedPdfFixture = Buffer.from(
  'JVBERi0xLjcKJYGBgYEKCjYgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCAxMjEKPj4Kc3RyZWFtCnicJYsxCgIxEEX7f4rUgjiZyU6yIBayAQsbYS4gsoqyFop4fieRD+83772wN1Boe9+wOczLd/7cL+d1prGkQrmMgVOwKxqPiF39057YCknk6mQntxdlSpMOmVW0aNSaExNPErszCLE3bvp6SbtgD9gK1XDCDzkPHx8KZW5kc3RyZWFtCmVuZG9iagoKNyAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovVHlwZSAvT2JqU3RtCi9OIDUKL0ZpcnN0IDI2Ci9MZW5ndGggMzY4Cj4+CnN0cmVhbQp4nNVS30vDMBB+z19xj/rgkqY/0soYbGurIOLYBEXxoWvDqIxE2lTmf+9d2zn2ID5L+Uju7rvkS+/zQICEIAAfVAwBhL6EEJSnYDpl/PHrQwNfFTvdMn5XVy28IkfAGt4YX9rOOPDYbMZO3GXhir3dsaEJPCIfGavGVl2pG5jmWZ4LoYQQUYCIhJAprktEgpAYY03GuEeoYATmlC+EP8daPiBSQw/Ve2449me4IjciTjpwg3iIf+6lu7LhDPmXnmTG+L2t0sJpuEivpZCRhwq9WCZSvVzi72h04ez/fVyvv7bm1xeezZnGS0NuNHmgnzJf69Z2TYljJ15usUKbW73/1K4uiyslkhh1qjhBj43G4M8P23dd9lQKs4O72TjSMCQod6+ruljYA7pP4Bcm4UTGEAfeBE9CJ86NsY682bvSONREUTQ69Uw4yWJ8021dH1LSY3xRtLoXfFKLUkxpq9rsgD/VZm7a+pigE78BtSLHRgplbmRzdHJlYW0KZW5kb2JqCgo4IDAgb2JqCjw8Ci9TaXplIDkKL1Jvb3QgMiAwIFIKL0luZm8gMyAwIFIKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL1R5cGUgL1hSZWYKL0xlbmd0aCA0MgovVyBbIDEgMiAyIF0KL0luZGV4IFsgMCA5IF0KPj4Kc3RyZWFtCnicY2Bg+P+fiYGdgQFEMIIIJhDBDCJYGBkEGBgYGS4BCaYVDAwAYioDxQplbmRzdHJlYW0KZW5kb2JqCgpzdGFydHhyZWYKNjgwCiUlRU9G',
  'base64',
);
const validSignedPdfFixture = Buffer.from(
  'JVBERi0xLjcKJYGBgYEKCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgNCAwIFIgXQovQ291bnQgMQo+PgplbmRvYmoKCjIgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDEgMCBSCj4+CmVuZG9iagoKMyAwIG9iago8PAovUHJvZHVjZXIgPEZFRkYwMDcwMDA2NDAwNjYwMDJEMDA2QzAwNjkwMDYyMDAyMDAwMjgwMDY4MDA3NDAwNzQwMDcwMDA3MzAwM0EwMDJGMDAyRjAwNjcwMDY5MDA3NDAwNjgwMDc1MDA2MjAwMkUwMDYzMDA2RjAwNkQwMDJGMDA0ODAwNkYwMDcwMDA2NDAwNjkwMDZFMDA2NzAwMkYwMDcwMDA2NDAwNjYwMDJEMDA2QzAwNjkwMDYyMDAyOT4KL01vZERhdGUgKEQ6MjAyNjEwMjgxODMwMTVaKQovQ3JlYXRvciA8RkVGRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDIwMDAyODAwNjgwMDc0MDA3NDAwNzAwMDczMDAzQTAwMkYwMDJGMDA2NzAwNjkwMDc0MDA2ODAwNzUwMDYyMDAyRTAwNjMwMDZGMDA2RDAwMkYwMDQ4MDA2RjAwNzAwMDY0MDA2OTAwNkUwMDY3MDAyRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDI5PgovQ3JlYXRpb25EYXRlIChEOjIwMjYxMDI4MTgzMDE1WikKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovSGVsdmV0aWNhLTcwOTg0ODA3ODkgNSAwIFIKPj4KL1hPYmplY3QgPDwKPj4KL0V4dEdTdGF0ZSA8PAo+Pgo+PgovTWVkaWFCb3ggWyAwIDAgNTk1LjI4IDg0MS44OSBdCi9Bbm5vdHMgWyBdCi9Db250ZW50cyBbIDYgMCBSIF0KPj4KZW5kb2JqCgo1IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQovRW5jb2RpbmcgL1dpbkFu c2lFbmNvZGluZwo+PgplbmRvYmoKCjYgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCAxMjEKPj4Kc3RyZWFtCnicJYsxCgIxEEX7f4rUgjiZyU6yIBayAQsbYS4gsoqyFop4fieRD+83772wN1Boe9+wOczLd/7cL+d1prGkQrmMgVOwKxqPiF39057YCknk6mQntxdlSpMOmVW0aNSaExNPErszCLE3bvp6SbtgD9gK1XDCDzkPHx8KZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE2IDAwMDAwIG4gCjAwMDAwMDAwNzYgMDAwMDAgbiAKMDAwMDAwMDEyNiAwMDAwMCBuIAowMDAwMDAwNTk2IDAwMDAwIG4gCjAwMDAwMDA3OTcgMDAwMDAgbiAKMDAwMDAwMDg5NSAwMDAwMCBuIAoKdHJhaWxlcgo8PAovU2l6ZSA3Ci9Sb290IDIgMCBSCi9JbmZvIDMgMCBSCj4+CgpzdGFydHhyZWYKMTA4OQolJUVPRg=='.replace(
    ' ',
    '',
  ),
  'base64',
);
const upstreamTextPdfFixture = readFileSync(
  resolve(process.cwd(), 'node_modules/pdf-parse/test/data/05-versions-space.pdf'),
);

describe('document import registry', () => {
  it('detects physical formats from signatures and extension hints', () => {
    expect(detectImportFormat('statement.pdf', Buffer.from('%PDF-1.7'))).toBe('pdf');
    expect(detectImportFormat('statement.xlsx', Buffer.from('PK\u0003\u0004'))).toBe('xlsx');
    expect(detectImportFormat('statement.csv', Buffer.from('date,amount\n'))).toBe('csv');
  });

  it('rejects a mismatched binary signature instead of trusting the extension', () => {
    try {
      detectImportFormat('statement.pdf', Buffer.from('not a pdf'));
      throw new Error('expected detection to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ImportError);
      expect((error as ImportError).code).toBe(ImportErrorCode.IMPORT_FILE_TYPE);
    }
    expect(() => detectImportFormat('statement.csv', Buffer.from('PK\u0003\u0004'))).toThrow(
      'IMPORT_FILE_SIGNATURE_MISMATCH',
    );
  });

  it('parses quoted CSV rows into the common preview contract', async () => {
    const preview = await parseImportDocument(
      Buffer.from('\uFEFFДата,Сумма,Описание\n01.02.2026,"-1 250,50","Кофе, центр"\n', 'utf8'),
      'statement.csv',
    );
    expect(preview.format).toBe('generic-csv');
    expect(preview.profileId).toBe('generic-csv-table');
    expect(preview.profileDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.reviewRequired).toBe(false);
    expect(preview.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.rows[0]).toMatchObject({
      sourceRef: { kind: 'csv', record: 1 },
      date: '2026-02-01',
      type: 'expense',
      amount: 1250.5,
      note: 'Кофе, центр',
    });
  });

  it('uses the populated debit or credit column instead of a zero placeholder', async () => {
    const preview = await parseImportDocument(
      Buffer.from('Дата;Дебет;Кредит;Счёт\n01.02.2026;0;1.234,56;Карта\n', 'utf8'),
      'statement.csv',
    );
    expect(preview.rows[0]).toMatchObject({
      type: 'income',
      amount: 1234.56,
      accountName: 'Карта',
    });
  });

  it('applies a supplied profile configuration to CSV parsing', async () => {
    const preview = await parseImportDocument(
      Buffer.from('Дата,Сумма,Счёт\n01.02.2026,-12.50,Карта\n', 'utf8'),
      'statement.csv',
      [
        {
          id: 'custom-signed-csv',
          version: '1.0.0',
          format: 'csv',
          match: { requiredHeaders: [['дата'], ['сумма']] },
          layout: { kind: 'table', amountMode: 'signed' },
          review: { alwaysRequired: false, minConfidence: 0.8 },
        },
      ],
    );
    expect(preview.profileId).toBe('custom-signed-csv');
    expect(preview.rows[0]).toMatchObject({ type: 'expense', amount: 12.5 });
  });

  it('uses profile aliases for non-standard CSV columns', async () => {
    const preview = await parseImportDocument(
      Buffer.from('Когда;Value;Wallet;Memo\n01.02.2026;-12,50;Карта;Кофе\n', 'utf8'),
      'statement.csv',
      [
        {
          id: 'custom-wallet-csv',
          version: '1.0.0',
          format: 'csv',
          match: { requiredHeaders: [['когда'], ['value']] },
          layout: {
            kind: 'table',
            amountMode: 'signed',
            delimiter: ';',
            columns: {
              date: ['когда'],
              amount: ['value'],
              account: ['wallet'],
              note: ['memo'],
            },
          },
          review: { alwaysRequired: false, minConfidence: 0.8 },
        },
      ],
    );
    expect(preview.profileId).toBe('custom-wallet-csv');
    expect(preview.rows[0]).toMatchObject({
      date: '2026-02-01',
      type: 'expense',
      amount: 12.5,
      accountName: 'Карта',
      note: 'Кофе',
    });
  });

  it('supports explicit first-amount PDF profiles without guessing silently', async () => {
    const preview = await parsePdf(
      Buffer.from('%PDF-1.7'),
      undefined,
      {
        id: 'bank-pdf-first-amount',
        version: '1.0.0',
        format: 'pdf',
        match: {},
        layout: {
          kind: 'pdf-lines',
          amountRule: 'first-amount',
          descriptionRule: 'between-date-and-amount',
        },
        review: { alwaysRequired: true, minConfidence: 0.95 },
      },
      { numpages: 1, text: '01.02.2026 Merchant 12,50 1000,00' },
    );
    expect(preview.rows[0]).toMatchObject({ amount: 12.5, note: 'Merchant' });
    expect(preview.rows[0].errors).not.toContain('PDF_AMOUNT_AMBIGUOUS');
  });

  it('extracts text from an upstream valid PDF through the real pdf-parse adapter', async () => {
    const extracted = await extractPdfText(upstreamTextPdfFixture);

    expect(extracted.numpages).toBe(1);
    expect(extracted.text).toContain('Dadfrtfjh');
  });

  it('reports malformed generated PDF input with the shared error contract', async () => {
    await expect(parseImportDocument(validSignedPdfFixture, 'statement.pdf')).rejects.toMatchObject(
      {
        code: ImportErrorCode.INVALID_PDF,
      },
    );
  });

  it('reports malformed PDF input with the shared error contract', async () => {
    await expect(parseImportDocument(signedPdfFixture, 'statement.pdf')).rejects.toMatchObject({
      code: ImportErrorCode.INVALID_PDF,
    });
  });
});
