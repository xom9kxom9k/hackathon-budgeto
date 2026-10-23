import { z } from 'zod';

import type { CashflowPoint, Transaction } from '@/entities/transaction/model/types';
import { BaseApiClient } from '@/shared/api/BaseApiClient';

import { BaseApiService } from './BaseApiService';

const partySchema = z.object({ id: z.string(), name: z.string(), currency: z.string() });
const transactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  kind: z.enum(['income', 'expense', 'transfer']),
  amount: z.number(),
  note: z.string().nullable(),
  account: partySchema,
  destinationAccount: partySchema.nullable(),
  category: z
    .object({ id: z.string(), name: z.string(), kind: z.enum(['income', 'expense']) })
    .nullable(),
});
const overviewResponseSchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  accountsCount: z.number().int().nonnegative(),
  totals: z.object({ income: z.number(), expenses: z.number(), net: z.number() }),
  cashflow: z.array(z.object({ period: z.string(), income: z.number(), expenses: z.number() })),
  recentTransactions: z.array(transactionSchema),
});

export interface OverviewFilters {
  from: string;
  to: string;
}

export interface OverviewSummary {
  period: OverviewFilters;
  accountsCount: number;
  totals: { income: number; expenses: number; net: number };
  cashflow: CashflowPoint[];
  recentTransactions: Transaction[];
}

export class OverviewService extends BaseApiService {
  constructor(apiClient: BaseApiClient) {
    super(apiClient, '/overview');
  }

  async getSummary(filters: OverviewFilters, signal?: AbortSignal): Promise<OverviewSummary> {
    const params = new URLSearchParams({ from: filters.from, to: filters.to });
    return this.get<OverviewSummary>(`?${params.toString()}`, overviewResponseSchema, signal);
  }
}
