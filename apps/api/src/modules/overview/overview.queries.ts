import type {
  TransactionRow,
  TransactionView,
} from '../transactions/queries/list-transactions.query';

export interface OverviewPeriod {
  from: string;
  to: string;
}

export interface OverviewTotals {
  income: number;
  expenses: number;
  net: number;
}

export interface OverviewCashflowPoint {
  period: string;
  income: number;
  expenses: number;
}

export interface OverviewSummaryView {
  period: OverviewPeriod;
  accountsCount: number;
  totals: OverviewTotals;
  cashflow: OverviewCashflowPoint[];
  recentTransactions: TransactionView[];
}

export interface OverviewSummaryFilters extends OverviewPeriod {}

export class GetOverviewSummaryQuery {
  constructor(
    public readonly userId: string,
    public readonly filters: OverviewSummaryFilters,
  ) {}
}

export interface OverviewCashflowRow {
  period: string;
  income: string;
  expenses: string;
}

export type OverviewRecentTransactionRow = TransactionRow;
