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
  currency: z.string().default('RUB'),
  availableCurrencies: z.array(z.string()).default(['RUB']),
  expenseCategories: z
    .array(
      z.object({
        id: z.string().nullable(),
        name: z.string().nullable(),
        amount: z.number(),
        count: z.number(),
      }),
    )
    .default([]),
  incomeCategories: z
    .array(
      z.object({
        id: z.string().nullable(),
        name: z.string().nullable(),
        amount: z.number(),
        count: z.number(),
      }),
    )
    .default([]),
  period: z.object({ from: z.string(), to: z.string() }),
  accountsCount: z.number().int().nonnegative(),
  totals: z.object({ income: z.number(), expenses: z.number(), net: z.number() }),
  cashflow: z.array(z.object({ period: z.string(), income: z.number(), expenses: z.number() })),
  recentTransactions: z.array(transactionSchema),
});

export interface OverviewFilters {
  currency?: string;
  from: string;
  to: string;
}

export interface OverviewSummary {
  currency?: string;
  availableCurrencies?: string[];
  expenseCategories?: CategoryTotal[];
  incomeCategories?: CategoryTotal[];
  period: OverviewFilters;
  accountsCount: number;
  totals: { income: number; expenses: number; net: number };
  cashflow: CashflowPoint[];
  recentTransactions: Transaction[];
}

export interface CategoryTotal {
  id: string | null;
  name: string | null;
  amount: number;
  count: number;
}

export class OverviewService extends BaseApiService {
  constructor(apiClient: BaseApiClient) {
    super(apiClient, '/overview');
  }

  async getSummary(filters: OverviewFilters, signal?: AbortSignal): Promise<OverviewSummary> {
    const params = new URLSearchParams({ from: filters.from, to: filters.to });
    if (filters.currency) params.set('currency', filters.currency);
    return this.get<OverviewSummary>(`?${params.toString()}`, overviewResponseSchema, signal);
  }
}
