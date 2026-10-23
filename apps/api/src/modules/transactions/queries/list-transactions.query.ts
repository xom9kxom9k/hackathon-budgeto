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
  reversedAt?: string | null;
}

export interface TransactionsPageView {
  items: TransactionView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TransactionRow {
  id: string;
  date: string;
  kind: TransactionView['kind'];
  amount: string;
  note: string | null;
  accountId: string;
  accountName: string;
  accountCurrency: string;
  destinationAccountId: string | null;
  destinationAccountName: string | null;
  destinationAccountCurrency: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryKind: TransactionCategoryView['kind'] | null;
}

export function mapTransactionRow(row: TransactionRow): TransactionView {
  return {
    id: row.id,
    date: row.date,
    kind: row.kind,
    amount: Number(row.amount),
    note: row.note,
    account: { id: row.accountId, name: row.accountName, currency: row.accountCurrency },
    destinationAccount:
      row.destinationAccountId && row.destinationAccountName && row.destinationAccountCurrency
        ? {
            id: row.destinationAccountId,
            name: row.destinationAccountName,
            currency: row.destinationAccountCurrency,
          }
        : null,
    category:
      row.categoryId && row.categoryName && row.categoryKind
        ? { id: row.categoryId, name: row.categoryName, kind: row.categoryKind }
        : null,
  };
}

export class ListTransactionsQuery {
  constructor(
    public readonly userId: string,
    public readonly filters: ListTransactionsFilters,
  ) {}
}
