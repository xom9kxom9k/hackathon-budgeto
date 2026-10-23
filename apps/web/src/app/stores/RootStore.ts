import { BaseApiClient } from '@/shared/api/BaseApiClient';
import { getApiBaseUrl } from '@/shared/config/env';
import { AccountsService } from '@/shared/services/AccountsService';
import { AuthService } from '@/shared/services/AuthService';
import { HealthService } from '@/shared/services/HealthService';
import { ImportService } from '@/shared/services/ImportService';
import { OverviewService } from '@/shared/services/OverviewService';
import { TransactionsService } from '@/shared/services/TransactionsService';

import { HealthStore } from './HealthStore';
import { AccountsStore } from './AccountsStore';
import { AuthStore } from './AuthStore';
import { ImportStore } from './ImportStore';
import { TransactionsStore } from './TransactionsStore';
import { LoaderStore } from './LoaderStore';
import { OverviewStore } from './OverviewStore';
import { StoreName } from './StoreName';
import { UiStore } from './UiStore';

export interface StoreMap {
  [StoreName.Loader]: LoaderStore;
  [StoreName.Auth]: AuthStore;
  [StoreName.Ui]: UiStore;
  [StoreName.Health]: HealthStore;
  [StoreName.Overview]: OverviewStore;
  [StoreName.Accounts]: AccountsStore;
  [StoreName.Transactions]: TransactionsStore;
  [StoreName.Import]: ImportStore;
}

export interface ServiceRegistry {
  health: HealthService;
  accounts: AccountsService;
  transactions: TransactionsService;
  overview: OverviewService;
  auth: AuthService;
  imports: ImportService;
}

export class RootStore {
  readonly loader: LoaderStore;
  readonly auth: AuthStore;
  readonly ui: UiStore;
  readonly health: HealthStore;
  readonly overview: OverviewStore;
  readonly accounts: AccountsStore;
  readonly transactions: TransactionsStore;
  readonly import: ImportStore;
  readonly apiClient: BaseApiClient;
  readonly services: ServiceRegistry;
  readonly stores: StoreMap;

  constructor() {
    this.loader = new LoaderStore();
    this.ui = new UiStore();
    this.apiClient = new BaseApiClient({
      baseUrl: getApiBaseUrl(),
      loaderStore: this.loader,
    });
    this.services = {
      health: new HealthService(this.apiClient),
      accounts: new AccountsService(this.apiClient),
      transactions: new TransactionsService(this.apiClient),
      overview: new OverviewService(this.apiClient),
      auth: new AuthService(this.apiClient),
      imports: new ImportService(this.apiClient),
    };
    this.auth = new AuthStore(this.services.auth);
    this.health = new HealthStore(this.services.health);
    this.overview = new OverviewStore(this.services.overview);
    this.accounts = new AccountsStore(this.services.accounts);
    this.transactions = new TransactionsStore(this.services.transactions);
    this.import = new ImportStore(this.services.imports);
    this.stores = {
      [StoreName.Loader]: this.loader,
      [StoreName.Auth]: this.auth,
      [StoreName.Ui]: this.ui,
      [StoreName.Health]: this.health,
      [StoreName.Overview]: this.overview,
      [StoreName.Accounts]: this.accounts,
      [StoreName.Transactions]: this.transactions,
      [StoreName.Import]: this.import,
    };
  }

  get<K extends StoreName>(name: K): StoreMap[K] {
    return this.stores[name];
  }
}
