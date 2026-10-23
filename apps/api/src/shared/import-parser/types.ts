export type ImportTransactionType = 'income' | 'expense' | 'transfer';

export type ImportIssueCode =
  | 'INVALID_DATE'
  | 'UNKNOWN_TYPE'
  | 'INVALID_AMOUNT'
  | 'ACCOUNT_REQUIRED'
  | 'ACCOUNT_NOT_FOUND'
  | 'DESTINATION_REQUIRED'
  | 'DESTINATION_NOT_FOUND'
  | 'TRANSFER_SAME_ACCOUNT'
  | 'CATEGORY_NOT_FOUND'
  | 'CATEGORY_TYPE_MISMATCH'
  | 'TRANSFER_CATEGORY_IGNORED'
  | 'DESTINATION_ONLY_FOR_TRANSFER'
  | 'EDIT_REQUIRES_RECHECK';

export interface ParsedImportRow {
  sourceRow: number;
  date: string | null;
  type: ImportTransactionType | null;
  amount: number | null;
  accountName: string | null;
  destinationAccountName: string | null;
  categoryName: string | null;
  note: string | null;
  valid: boolean;
  errors: ImportIssueCode[];
  warnings: ImportIssueCode[];
}

export interface ParsedImportPreview {
  format: 'budgeto-xlsx' | 'finance-export-xlsx';
  total: number;
  valid: number;
  invalid: number;
  rows: ParsedImportRow[];
}
