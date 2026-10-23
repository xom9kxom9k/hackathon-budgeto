import { makeAutoObservable } from 'mobx';

import type { Transaction } from '@/entities/transaction/model/types';
import type {
  TransactionsService,
  TransactionFilters,
  TransactionInput,
} from '@/shared/services/TransactionsService';
import type { VaultStore } from './VaultStore';
import type { RequestStatus } from '@/shared/types/request';

const defaultFilters: TransactionFilters = { page: 1, pageSize: 50 };

export class TransactionsStore {
  status: RequestStatus = 'idle';
  errorCode: string | null = null;
  items: Transaction[] = [];
  total = 0;
  page = defaultFilters.page;
  pageSize = defaultFilters.pageSize;
  filters: TransactionFilters = { ...defaultFilters };
  private requestKey: string | null = null;
  private requestPromise: Promise<void> | null = null;
  private requestVersion = 0;

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly vaultStore?: VaultStore,
  ) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(filters: TransactionFilters = this.filters): Promise<void> {
    const key = JSON.stringify(filters);
    if (this.status === 'success' && this.requestKey === key) return;
    if (this.requestPromise && this.requestKey === key) return this.requestPromise;

    this.filters = { ...filters };
    this.status = 'loading';
    this.errorCode = null;
    this.requestKey = key;
    const version = ++this.requestVersion;
    const promise = this.transactionsService
      .list(this.filters)
      .then((result) => {
        if (version !== this.requestVersion) return;
        this.items = result.items;
        this.total = result.total;
        this.page = result.page;
        this.pageSize = result.pageSize;
        this.status = result.items.length ? 'success' : 'empty';
      })
      .catch((error: unknown) => {
        if (version !== this.requestVersion) return;
        this.status = 'error';
        this.errorCode = error instanceof Error ? error.message : 'TRANSACTIONS_LOAD_FAILED';
      })
      .finally(() => {
        if (version === this.requestVersion) this.requestPromise = null;
      });

    this.requestPromise = promise;
    return promise;
  }

  async retry(): Promise<void> {
    this.status = 'idle';
    await this.load(this.filters);
  }

  async setFilters(filters: TransactionFilters): Promise<void> {
    this.status = 'idle';
    await this.load(filters);
  }

  async create(input: TransactionInput): Promise<void> {
    if (!this.vaultStore) throw new Error('VAULT_KEY_REQUIRED');
    const claim = await this.transactionsService.prepareClaim(input);
    const [proof] = await this.vaultStore.createProofs([claim]);
    await this.transactionsService.create(input, proof);
    await this.refreshAfterMutation();
  }

  async update(id: string, input: TransactionInput): Promise<void> {
    if (!this.vaultStore) throw new Error('VAULT_KEY_REQUIRED');
    const claim = await this.transactionsService.prepareClaim(input);
    const [proof] = await this.vaultStore.createProofs([claim]);
    await this.transactionsService.update(id, input, proof);
    await this.refreshAfterMutation();
  }

  private async refreshAfterMutation(): Promise<void> {
    this.status = 'idle';
    await this.load(this.filters);
  }
}
