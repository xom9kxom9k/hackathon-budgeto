import { makeAutoObservable } from 'mobx';

import type { AccountSummary, Bank, FinancialProduct } from '@/entities/account/model/types';
import type { RequestStatus } from '@/shared/types/request';

export class AccountsStore {
  status: RequestStatus = 'success';
  banks: Bank[] = [];
  accounts: AccountSummary[] = [];
  products: FinancialProduct[] = [];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get availableBalance(): number {
    return this.accounts.reduce((total, account) => total + Math.max(account.balance, 0), 0);
  }

  getAccount(accountId: string): AccountSummary | undefined {
    return this.accounts.find((account) => account.id === accountId);
  }

  getBank(bankId: string): Bank | undefined {
    return this.banks.find((bank) => bank.id === bankId);
  }

  getProduct(productId: string): FinancialProduct | undefined {
    return this.products.find((product) => product.id === productId);
  }

  getAccountsForBank(bankId: string): AccountSummary[] {
    return this.accounts.filter((account) => account.bankId === bankId);
  }

  getProductsForAccount(accountId: string): FinancialProduct[] {
    return this.products.filter((product) => product.accountId === accountId);
  }
}
