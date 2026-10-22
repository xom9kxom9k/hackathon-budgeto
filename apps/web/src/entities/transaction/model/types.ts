export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  currency: string;
}

export interface CashflowPoint {
  period: string;
  income: number;
  expenses: number;
}
