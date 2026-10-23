import { z } from 'zod';
import { BaseApiClient } from '@/shared/api/BaseApiClient';
import { BaseApiService } from './BaseApiService';

const rowSchema = z.object({
  sourceRow: z.number(),
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
  format: z.enum(['budgeto-xlsx', 'finance-export-xlsx']),
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
export type ImportJob = z.infer<typeof jobSchema>;
export type ImportRow = z.infer<typeof rowSchema>;
export type ImportResult = z.infer<typeof confirmSchema>;

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
  updateRows(jobId: string, rows: ImportRow[]): Promise<ImportJob> {
    return this.patch(`/${jobId}/rows`, { rows }, jobSchema);
  }
  confirm(jobId: string): Promise<ImportResult> {
    return this.post(`/${jobId}/confirm`, {}, confirmSchema);
  }
  private patch<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
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
