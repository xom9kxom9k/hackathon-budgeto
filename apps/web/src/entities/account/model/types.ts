export interface Account {
  id: string;
  name: string;
  currency: string;
}

export type AccountStatus = 'connected' | 'demo' | 'offline';

export interface Bank {
  id: string;
  name: string;
  status: AccountStatus;
  lastSyncedAt: string;
  accountIds: string[];
}

export interface AccountSummary extends Account {
  bankId: string;
  type: string;
  balance: number;
  status: AccountStatus;
  lastSyncedAt: string;
  productIds: string[];
}

export interface FinancialProduct {
  id: string;
  bankId: string;
  accountId: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  status: AccountStatus;
}
