import { makeAutoObservable } from 'mobx';

import type {
  Account,
  AccountSummary,
  Bank,
  FinancialProduct,
} from '@/entities/account/model/types';
import type { AccountsService } from '@/shared/services/AccountsService';
import type { RequestStatus } from '@/shared/types/request';

export class AccountsStore {
  status: RequestStatus = 'idle';
  errorCode: string | null = null;
  accounts: Account[] = [];
  banks: Bank[] = [];
  products: FinancialProduct[] = [];
  private loadPromise: Promise<void> | null = null;

  constructor(private readonly accountsService: AccountsService) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(): Promise<void> {
    if (this.status === 'success' || this.status === 'empty') return;
    if (this.loadPromise) return this.loadPromise;

    this.status = 'loading';
    this.errorCode = null;
    this.loadPromise = this.accountsService
      .list()
      .then((accounts) => {
        this.accounts = accounts;
        this.status = accounts.length ? 'success' : 'empty';
      })
      .catch((error: unknown) => {
        this.status = 'error';
        this.errorCode = error instanceof Error ? error.message : 'ACCOUNTS_LOAD_FAILED';
      })
      .finally(() => {
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  async retry(): Promise<void> {
    this.status = 'idle';
    await this.load();
  }

  getAccount(accountId: string): Account | undefined {
    return this.accounts.find((account) => account.id === accountId);
  }

  getBank(bankId: string): Bank | undefined {
    return this.banks.find((bank) => bank.id === bankId);
  }

  getProduct(productId: string): FinancialProduct | undefined {
    return this.products.find((product) => product.id === productId);
  }

  getAccountsForBank(bankId: string): AccountSummary[] {
    return this.accounts.filter(
      (account): account is AccountSummary => 'bankId' in account && account.bankId === bankId,
    );
  }

  getProductsForAccount(accountId: string): FinancialProduct[] {
    return this.products.filter((product) => product.accountId === accountId);
  }
}
