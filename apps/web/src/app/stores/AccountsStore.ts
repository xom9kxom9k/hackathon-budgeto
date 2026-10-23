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
  mutationStatus: 'idle' | 'saving' | 'success' | 'error' = 'idle';
  mutationErrorCode: string | null = null;
  private loadPromise: Promise<void> | null = null;
  private mutationPromise: Promise<void> | null = null;

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

  async create(input: { name: string; currency: string }): Promise<void> {
    if (this.mutationPromise) return this.mutationPromise;
    return this.mutate(() => this.accountsService.create(input));
  }

  async update(id: string, input: { name: string }): Promise<void> {
    if (this.mutationPromise) return this.mutationPromise;
    return this.mutate(() => this.accountsService.update(id, input));
  }

  async archive(id: string): Promise<void> {
    if (this.mutationPromise) return this.mutationPromise;
    return this.mutate(() => this.accountsService.archive(id));
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

  private async mutate(operation: () => Promise<unknown>): Promise<void> {
    this.mutationStatus = 'saving';
    this.mutationErrorCode = null;
    this.mutationPromise = operation()
      .then(() => {
        this.mutationStatus = 'success';
        this.status = 'idle';
        return this.load();
      })
      .catch((error: unknown) => {
        this.mutationStatus = 'error';
        this.mutationErrorCode = error instanceof Error ? error.message : 'ACCOUNT_MUTATION_FAILED';
      })
      .finally(() => {
        this.mutationPromise = null;
      });
    return this.mutationPromise;
  }
}
