export type ImportTransactionType = 'income' | 'expense' | 'transfer';

export type ImportSourceKind = 'xlsx' | 'csv' | 'pdf';

export type ImportPreviewFormat =
  'budgeto-xlsx' | 'finance-export-xlsx' | 'generic-csv' | 'generic-pdf';

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
  | 'EDIT_REQUIRES_RECHECK'
  | 'PDF_AMOUNT_AMBIGUOUS'
  | 'PDF_TEXT_NOT_FOUND';

export interface ImportSourceRef {
  kind: ImportSourceKind;
  sheet?: string;
  page?: number;
  record?: number;
}

export interface ParsedImportRow {
  sourceRow: number;
  sourceRef: ImportSourceRef;
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
  format: ImportPreviewFormat;
  parserId: string;
  parserVersion: string;
  templateId: string;
  profileId?: string;
  profileVersion?: string;
  profileDigest?: string;
  reviewRequired?: boolean;
  reviewReasons?: string[];
  classifierConfidence?: number;
  confidence: number;
  sourceSha256?: string;
  total: number;
  valid: number;
  invalid: number;
  rows: ParsedImportRow[];
}

export type ImportProfileLayout =
  | {
      kind: 'table';
      amountMode: 'signed' | 'debit-credit';
      delimiter?: ',' | ';' | '\t';
      columns?: Record<string, string[]>;
    }
  | {
      kind: 'pdf-lines';
      amountRule: 'single-amount-only' | 'signed-amount' | 'first-amount' | 'last-amount';
      descriptionRule: 'between-date-and-amount';
    };

export interface ImportProfile {
  id: string;
  version: string;
  format: ImportSourceKind;
  match: {
    previewFormat?: ImportPreviewFormat;
    requiredHeaders?: string[][];
    textAnchors?: string[];
  };
  layout: ImportProfileLayout;
  review: {
    alwaysRequired: boolean;
    minConfidence: number;
  };
}

export interface ImportProfileClassificationInput {
  format: ImportSourceKind;
  previewFormat?: ImportPreviewFormat;
  headers?: string[];
  sampleText?: string;
}

export interface ImportProfileCandidate {
  profile: ImportProfile;
  score: number;
  matchedHeaders: number;
  matchedAnchors: number;
}

export interface ImportProfileSelection {
  profile: ImportProfile;
  confidence: number;
  reviewRequired: boolean;
  reviewReasons: string[];
  candidates: ImportProfileCandidate[];
}
