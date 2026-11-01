import { action, makeAutoObservable } from 'mobx';

import type { CashflowPoint, Transaction } from '@/entities/transaction/model/types';
import type { OverviewFilters, OverviewService } from '@/shared/services/OverviewService';
import type { CategoryTotal } from '@/shared/services/OverviewService';
import type { RequestStatus } from '@/shared/types/request';

export class OverviewStore {
  status: RequestStatus = 'idle';
  errorCode: string | null = null;
  accountsCount = 0;
  income = 0;
  expenses = 0;
  net = 0;
  currency = 'RUB';
  availableCurrencies = ['RUB'];
  expenseCategories: CategoryTotal[] = [];
  incomeCategories: CategoryTotal[] = [];
  transactions: Transaction[] = [];
  cashflow: CashflowPoint[] = [];
  period: OverviewFilters | null = null;
  private requestKey: string | null = null;
  private requestPromise: Promise<void> | null = null;
  private requestVersion = 0;

  constructor(private readonly overviewService: OverviewService) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(filters: OverviewFilters): Promise<void> {
    const key = JSON.stringify(filters);
    if (this.status === 'success' && this.requestKey === key) return;
    if (this.requestPromise && this.requestKey === key) return this.requestPromise;

    this.status = 'loading';
    this.errorCode = null;
    this.requestKey = key;
    this.period = filters;
    const version = ++this.requestVersion;
    const promise = this.overviewService
      .getSummary(filters)
      .then(
        action((summary) => {
          if (version !== this.requestVersion) return;
          this.period = { ...filters, ...summary.period };
          this.accountsCount = summary.accountsCount;
          this.income = summary.totals.income;
          this.expenses = summary.totals.expenses;
          this.net = summary.totals.net;
          this.currency = summary.currency ?? 'RUB';
          this.availableCurrencies = summary.availableCurrencies ?? ['RUB'];
          this.expenseCategories = summary.expenseCategories ?? [];
          this.incomeCategories = summary.incomeCategories ?? [];
          this.cashflow = summary.cashflow;
          this.transactions = summary.recentTransactions;
          this.status =
            summary.accountsCount || summary.recentTransactions.length || summary.cashflow.length
              ? 'success'
              : 'empty';
        }),
      )
      .catch(
        action((error: unknown) => {
          if (version !== this.requestVersion) return;
          this.status = 'error';
          this.errorCode = error instanceof Error ? error.message : 'OVERVIEW_LOAD_FAILED';
        }),
      )
      .finally(
        action(() => {
          if (version === this.requestVersion) this.requestPromise = null;
        }),
      );

    this.requestPromise = promise;
    return promise;
  }

  async retry(): Promise<void> {
    if (!this.period) return;
    this.status = 'idle';
    await this.load(this.period);
  }
}
