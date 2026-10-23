import { TransactionKind } from '../entities/transaction.entity';

export interface ListTransactionsFilters {
  page: number;
  pageSize: number;
  accountId?: string;
  kind?: TransactionKind;
  query?: string;
  from?: string;
  to?: string;
}

export interface TransactionPartyView {
  id: string;
  name: string;
  currency: string;
}

export interface TransactionCategoryView {
  id: string;
  name: string;
  kind: 'income' | 'expense';
}

export interface TransactionView {
  id: string;
  date: string;
  kind: TransactionKind;
  amount: number;
  note: string | null;
  account: TransactionPartyView;
  destinationAccount: TransactionPartyView | null;
  category: TransactionCategoryView | null;
}

export interface TransactionsPageView {
  items: TransactionView[];
  total: number;
  page: number;
  pageSize: number;
}

export class ListTransactionsQuery {
  constructor(
    public readonly userId: string,
    public readonly filters: ListTransactionsFilters,
  ) {}
}
