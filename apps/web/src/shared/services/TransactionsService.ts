import { z } from 'zod';

import type { Transaction } from '@/entities/transaction/model/types';
import { BaseApiClient } from '@/shared/api/BaseApiClient';

import { BaseApiService } from './BaseApiService';

const partySchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.string(),
});
const transactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  kind: z.enum(['income', 'expense', 'transfer']),
  amount: z.number(),
  note: z.string().nullable(),
  account: partySchema,
  destinationAccount: partySchema.nullable(),
  category: z
    .object({
      id: z.string(),
      name: z.string(),
      kind: z.enum(['income', 'expense']),
    })
    .nullable(),
});
const transactionsResponseSchema = z.object({
  items: z.array(transactionSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
const claimSchema = z.object({
  sourceRow: z.number(),
  operationId: z.string(),
  fingerprint: z.string(),
  payloadHash: z.string(),
  canonicalPayload: z.string(),
  claimDigest: z.string(),
});

export interface TransactionFilters {
  page: number;
  pageSize: number;
  accountId?: string;
  kind?: Transaction['kind'];
  query?: string;
  from?: string;
  to?: string;
}

export interface TransactionsPage {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}
export type TransactionInput = {
  date: string;
  kind: Transaction['kind'];
  amount: number;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  note: string | null;
  operationId: string;
};
export type TransactionClaim = z.infer<typeof claimSchema>;

export class TransactionsService extends BaseApiService {
  constructor(apiClient: BaseApiClient) {
    super(apiClient, '/transactions');
  }

  async list(filters: TransactionFilters, signal?: AbortSignal): Promise<TransactionsPage> {
    const params = new URLSearchParams({
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    });

    if (filters.accountId) params.set('accountId', filters.accountId);
    if (filters.kind) params.set('kind', filters.kind);
    if (filters.query) params.set('q', filters.query);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);

    return this.get<TransactionsPage>(`?${params.toString()}`, transactionsResponseSchema, signal);
  }

  prepareClaim(input: TransactionInput): Promise<TransactionClaim> {
    return this.post('/claims', input, claimSchema);
  }

  create(input: TransactionInput, proof: unknown): Promise<void> {
    return this.post('', { ...input, proof }, z.unknown()).then(() => undefined);
  }

  update(id: string, input: TransactionInput, proof: unknown): Promise<void> {
    return this.patch(`/${encodeURIComponent(id)}`, { ...input, proof }, z.unknown()).then(
      () => undefined,
    );
  }

  reverse(id: string, operationId: string, proof: unknown): Promise<void> {
    return this.post(
      `/${encodeURIComponent(id)}/reverse`,
      { operationId, proof },
      z.unknown(),
    ).then(() => undefined);
  }
}
