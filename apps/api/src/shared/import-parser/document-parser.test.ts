import { describe, expect, it } from 'vitest';

import { detectImportFormat, parseImportDocument } from './document-parser';

describe('document import registry', () => {
  it('detects physical formats from signatures and extension hints', () => {
    expect(detectImportFormat('statement.pdf', Buffer.from('%PDF-1.7'))).toBe('pdf');
    expect(detectImportFormat('statement.xlsx', Buffer.from('PK\u0003\u0004'))).toBe('xlsx');
    expect(detectImportFormat('statement.csv', Buffer.from('date,amount\n'))).toBe('csv');
  });

  it('rejects a mismatched binary signature instead of trusting the extension', () => {
    expect(() => detectImportFormat('statement.pdf', Buffer.from('not a pdf'))).toThrow(
      'IMPORT_FILE_TYPE',
    );
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
});
