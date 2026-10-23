import { makeAutoObservable } from 'mobx';

import type { CashflowPoint, Transaction } from '@/entities/transaction/model/types';
import type { OverviewFilters, OverviewService } from '@/shared/services/OverviewService';
import type { RequestStatus } from '@/shared/types/request';

export class OverviewStore {
  status: RequestStatus = 'idle';
  errorCode: string | null = null;
  accountsCount = 0;
  income = 0;
  expenses = 0;
  net = 0;
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
    const version = ++this.requestVersion;
    const promise = this.overviewService
      .getSummary(filters)
      .then((summary) => {
        if (version !== this.requestVersion) return;
        this.period = summary.period;
        this.accountsCount = summary.accountsCount;
        this.income = summary.totals.income;
        this.expenses = summary.totals.expenses;
        this.net = summary.totals.net;
        this.cashflow = summary.cashflow;
        this.transactions = summary.recentTransactions;
        this.status =
          summary.accountsCount || summary.recentTransactions.length ? 'success' : 'empty';
      })
      .catch((error: unknown) => {
        if (version !== this.requestVersion) return;
        this.status = 'error';
        this.errorCode = error instanceof Error ? error.message : 'OVERVIEW_LOAD_FAILED';
      })
      .finally(() => {
        if (version === this.requestVersion) this.requestPromise = null;
      });

    this.requestPromise = promise;
    return promise;
  }

  async retry(): Promise<void> {
    if (!this.period) return;
    this.status = 'idle';
    await this.load(this.period);
  }
}
