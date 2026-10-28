import type { ImportPreviewFormat, ImportSourceKind } from '../types';

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
