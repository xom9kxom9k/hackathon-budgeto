import type { ImportProfile } from './types';

export const builtinImportProfiles: readonly ImportProfile[] = [
  {
    id: 'budgetto-xlsx',
    version: '1.0.0',
    format: 'xlsx',
    match: { previewFormat: 'budgetto-xlsx' },
    layout: { kind: 'table', amountMode: 'signed' },
    review: { alwaysRequired: false, minConfidence: 0.9 },
  },
  {
    id: 'budgetto-finance-xlsx',
    version: '1.0.0',
    format: 'xlsx',
    match: { previewFormat: 'finance-export-xlsx' },
    layout: { kind: 'table', amountMode: 'signed' },
    review: { alwaysRequired: false, minConfidence: 0.9 },
  },
  {
    id: 'generic-csv-table',
    version: '1.0.0',
    format: 'csv',
    match: {
      previewFormat: 'generic-csv',
      requiredHeaders: [
        ['date', 'дата'],
        ['amount', 'сумма', 'debit', 'дебет', 'credit', 'кредит'],
      ],
    },
    layout: { kind: 'table', amountMode: 'debit-credit' },
    review: { alwaysRequired: false, minConfidence: 0.8 },
  },
  {
    id: 'generic-pdf-text-table',
    version: '1.0.0',
    format: 'pdf',
    match: { previewFormat: 'generic-pdf' },
    layout: {
      kind: 'pdf-lines',
      amountRule: 'single-amount-only',
      descriptionRule: 'between-date-and-amount',
    },
    review: { alwaysRequired: true, minConfidence: 0.95 },
  },
  {
    id: 'ozon-pdf-v1',
    version: '1.0.0',
    format: 'pdf',
    match: { textAnchors: ['ООО «ОЗОН Банк»'] },
    layout: {
      kind: 'pdf-lines',
      amountRule: 'signed-amount',
      descriptionRule: 'between-date-and-amount',
      recordRule: 'date-block',
      recordStartRule: 'date-and-amount',
    },
    review: { alwaysRequired: true, minConfidence: 0.9 },
  },
  {
    id: 'sber-pdf-v1',
    version: '1.0.0',
    format: 'pdf',
    match: { textAnchors: ['www.sberbank.ru', 'Расшифровка операций'] },
    layout: {
      kind: 'pdf-lines',
      amountRule: 'first-amount',
      descriptionRule: 'between-date-and-amount',
      recordRule: 'date-block',
      recordStartRule: 'date-and-amount',
      unsignedAmountType: 'expense',
    },
    review: { alwaysRequired: true, minConfidence: 0.9 },
  },
  {
    id: 'tbank-pdf-v1',
    version: '1.0.0',
    format: 'pdf',
    match: { textAnchors: ['АО «ТБАНК»', 'Движение средств'] },
    layout: {
      kind: 'pdf-lines',
      amountRule: 'last-amount',
      descriptionRule: 'after-amount',
      recordRule: 'date-block',
      recordStartRule: 'date-and-amount',
    },
    review: { alwaysRequired: true, minConfidence: 0.9 },
  },
];
