import { BaseApiClient } from '@/shared/api/BaseApiClient';
import { getApiBaseUrl } from '@/shared/config/env';
import { AccountsService } from '@/shared/services/AccountsService';
import { CategoriesService } from '@/shared/services/CategoriesService';
import { AuthService } from '@/shared/services/AuthService';
import { HealthService } from '@/shared/services/HealthService';
import { ImportService } from '@/shared/services/ImportService';
import { OverviewService } from '@/shared/services/OverviewService';
import { TransactionsService } from '@/shared/services/TransactionsService';
import { VaultService } from '@/shared/services/VaultService';
import { ProfileService } from '@/shared/services/ProfileService';
import { SecurityService } from '@/shared/services/SecurityService';

import { HealthStore } from './HealthStore';
import { AccountsStore } from './AccountsStore';
import { CategoriesStore } from './CategoriesStore';
import { AuthStore } from './AuthStore';
import { ImportStore } from './ImportStore';
import { TransactionsStore } from './TransactionsStore';
import { LoaderStore } from './LoaderStore';
import { OverviewStore } from './OverviewStore';
import { StoreName } from './StoreName';
import { UiStore } from './UiStore';
import { VaultStore } from './VaultStore';
import { ProfileStore } from './ProfileStore';
import { SecurityStore } from './SecurityStore';

export interface StoreMap {
  [StoreName.Loader]: LoaderStore;
  [StoreName.Auth]: AuthStore;
  [StoreName.Ui]: UiStore;
  [StoreName.Health]: HealthStore;
  [StoreName.Overview]: OverviewStore;
  [StoreName.Accounts]: AccountsStore;
  [StoreName.Transactions]: TransactionsStore;
  [StoreName.Import]: ImportStore;
  [StoreName.Categories]: CategoriesStore;
  [StoreName.Vault]: VaultStore;
  [StoreName.Profile]: ProfileStore;
  [StoreName.Security]: SecurityStore;
}

export interface ServiceRegistry {
  health: HealthService;
  accounts: AccountsService;
  categories: CategoriesService;
  transactions: TransactionsService;
  overview: OverviewService;
  auth: AuthService;
  imports: ImportService;
  vault: VaultService;
  profile: ProfileService;
  security: SecurityService;
}

export class RootStore {
  readonly loader: LoaderStore;
  readonly auth: AuthStore;
  readonly ui: UiStore;
  readonly health: HealthStore;
  readonly overview: OverviewStore;
  readonly accounts: AccountsStore;
  readonly categories: CategoriesStore;
  readonly transactions: TransactionsStore;
  readonly import: ImportStore;
  readonly vault: VaultStore;
  readonly profile: ProfileStore;
  readonly security: SecurityStore;
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
      categories: new CategoriesService(this.apiClient),
      transactions: new TransactionsService(this.apiClient),
      overview: new OverviewService(this.apiClient),
      auth: new AuthService(this.apiClient),
      imports: new ImportService(this.apiClient),
      vault: new VaultService(this.apiClient),
      profile: new ProfileService(this.apiClient),
      security: new SecurityService(this.apiClient),
    };
    this.auth = new AuthStore(this.services.auth);
    this.health = new HealthStore(this.services.health);
    this.overview = new OverviewStore(this.services.overview);
    this.accounts = new AccountsStore(this.services.accounts);
    this.categories = new CategoriesStore(this.services.categories);
    this.vault = new VaultStore(this.services.vault);
    this.transactions = new TransactionsStore(this.services.transactions, this.vault);
    this.import = new ImportStore(this.services.imports, this.vault);
    this.profile = new ProfileStore(this.services.profile);
    this.security = new SecurityStore(this.services.security);
    this.stores = {
      [StoreName.Loader]: this.loader,
      [StoreName.Auth]: this.auth,
      [StoreName.Ui]: this.ui,
      [StoreName.Health]: this.health,
      [StoreName.Overview]: this.overview,
      [StoreName.Accounts]: this.accounts,
      [StoreName.Transactions]: this.transactions,
      [StoreName.Import]: this.import,
      [StoreName.Categories]: this.categories,
      [StoreName.Vault]: this.vault,
      [StoreName.Profile]: this.profile,
      [StoreName.Security]: this.security,
    };
  }

  get<K extends StoreName>(name: K): StoreMap[K] {
    return this.stores[name];
  }
}
