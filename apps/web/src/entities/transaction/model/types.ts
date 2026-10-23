export interface Transaction {
  id: string;
  date: string;
  kind: 'income' | 'expense' | 'transfer';
  amount: number;
  note: string | null;
  account: TransactionAccount;
  destinationAccount: TransactionAccount | null;
  category: TransactionCategory | null;
}

export interface TransactionAccount {
  id: string;
  name: string;
  currency: string;
}

export interface TransactionCategory {
  id: string;
  name: string;
  kind: 'income' | 'expense';
}

export interface CashflowPoint {
  period: string;
  income: number;
  expenses: number;
}
