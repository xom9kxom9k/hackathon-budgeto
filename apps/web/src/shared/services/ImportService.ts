import { z } from 'zod';
import { BaseApiClient } from '@/shared/api/BaseApiClient';
import { BaseApiService } from './BaseApiService';

const rowSchema = z.object({
  sourceRow: z.number(),
  sourceRef: z
    .object({
      kind: z.enum(['xlsx', 'csv', 'pdf']),
      sheet: z.string().optional(),
      page: z.number().optional(),
      record: z.number().optional(),
    })
    .optional(),
  date: z.string().nullable(),
  type: z.enum(['income', 'expense', 'transfer']).nullable(),
  amount: z.number().nullable(),
  accountName: z.string().nullable(),
  destinationAccountName: z.string().nullable(),
  categoryName: z.string().nullable(),
  note: z.string().nullable(),
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});
const previewSchema = z.object({
  format: z.enum(['budgeto-xlsx', 'finance-export-xlsx', 'generic-csv', 'generic-pdf']),
  parserId: z.string().optional(),
  parserVersion: z.string().optional(),
  templateId: z.string().optional(),
  profileId: z.string().optional(),
  profileVersion: z.string().optional(),
  profileDigest: z.string().optional(),
  reviewRequired: z.boolean().optional(),
  reviewReasons: z.array(z.string()).optional(),
  classifierConfidence: z.number().optional(),
  confidence: z.number().optional(),
  sourceSha256: z.string().optional(),
  total: z.number(),
  valid: z.number(),
  invalid: z.number(),
  rows: z.array(rowSchema),
});
const jobSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  status: z.enum(['queued', 'parsing', 'preview', 'confirmed', 'failed']),
  preview: previewSchema.nullable(),
  errorCode: z.string().nullable(),
});
const confirmSchema = z.object({ created: z.number(), skipped: z.number() });
const claimSchema = z.object({
  sourceRow: z.number(),
  operationId: z.string(),
  fingerprint: z.string(),
  payloadHash: z.string(),
  canonicalPayload: z.string(),
  claimDigest: z.string(),
});
const claimsSchema = z.object({ claims: z.array(claimSchema) });
const proofSchema = z.object({
  sourceRow: z.number(),
  fingerprint: z.string(),
  payloadHash: z.string(),
  ciphertext: z.string(),
  iv: z.string(),
  authTag: z.string(),
  signature: z.string(),
  publicKeyId: z.string(),
  keyVersion: z.number(),
});
export type ImportJob = z.infer<typeof jobSchema>;
export type ImportRow = z.infer<typeof rowSchema>;
export type ImportResult = z.infer<typeof confirmSchema>;
export type ImportHistoryItem = z.infer<typeof jobSchema> & {
  createdAt: string;
  confirmedAt: string | null;
  rowCount: number;
  created: number | null;
  skipped: number | null;
};
export type ImportConfirmationClaims = z.infer<typeof claimsSchema>;
export type VaultProof = z.infer<typeof proofSchema>;

export class ImportService extends BaseApiService {
  constructor(apiClient: BaseApiClient) {
    super(apiClient, '/imports');
  }
  create(file: File): Promise<ImportJob> {
    const body = new FormData();
    body.append('file', file);
    return this.request('', { method: 'POST', body }, jobSchema);
  }
  getJob(jobId: string, signal?: AbortSignal): Promise<ImportJob> {
    return super.get(`/${jobId}`, jobSchema, signal);
  }
  updateRows(jobId: string, rows: ImportRow[], reviewAcknowledged = false): Promise<ImportJob> {
    return this.patchRows(`/${jobId}/rows`, { rows, reviewAcknowledged }, jobSchema);
  }
  getConfirmationClaims(jobId: string): Promise<ImportConfirmationClaims> {
    return super.get(`/${jobId}/confirmation-claims`, claimsSchema);
  }
  confirm(jobId: string, proofs: VaultProof[]): Promise<ImportResult> {
    return this.post(`/${jobId}/confirm`, { proofs }, confirmSchema);
  }
  list(): Promise<ImportHistoryItem[]> {
    return super.get(
      '',
      z.array(
        jobSchema.extend({
          createdAt: z.string(),
          confirmedAt: z.string().nullable(),
          rowCount: z.number(),
          created: z.number().nullable(),
          skipped: z.number().nullable(),
        }),
      ),
    );
  }
  retry(jobId: string): Promise<ImportJob> {
    return this.post(`/${jobId}/retry`, {}, jobSchema);
  }
  deleteStaging(jobId: string): Promise<void> {
    return this.request(`/${jobId}/staging`, { method: 'DELETE' }, z.unknown()).then(
      () => undefined,
    );
  }
  private patchRows<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
    return this.request(
      path,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      },
      schema,
    );
  }
}
