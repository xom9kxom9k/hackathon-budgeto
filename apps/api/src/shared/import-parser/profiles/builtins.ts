import type { ImportProfile } from './types';

export const builtinImportProfiles: readonly ImportProfile[] = [
  {
    id: 'budgeto-xlsx',
    version: '1.0.0',
    format: 'xlsx',
    match: { previewFormat: 'budgeto-xlsx' },
    layout: { kind: 'table', amountMode: 'signed' },
    review: { alwaysRequired: false, minConfidence: 0.9 },
  },
  {
    id: 'budgeto-finance-xlsx',
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
];
