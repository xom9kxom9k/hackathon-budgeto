import { BaseApiClient } from '@/shared/api/BaseApiClient';
import { getApiBaseUrl } from '@/shared/config/env';
import { AccountsService } from '@/shared/services/AccountsService';
import { HealthService } from '@/shared/services/HealthService';

import { HealthStore } from './HealthStore';
import { ImportStore } from './ImportStore';
import { LoaderStore } from './LoaderStore';
import { OverviewStore } from './OverviewStore';
import { StoreName } from './StoreName';
import { UiStore } from './UiStore';

export interface StoreMap {
  [StoreName.Loader]: LoaderStore;
  [StoreName.Ui]: UiStore;
  [StoreName.Health]: HealthStore;
  [StoreName.Overview]: OverviewStore;
  [StoreName.Import]: ImportStore;
}

export interface ServiceRegistry {
  health: HealthService;
  accounts: AccountsService;
}

export class RootStore {
  readonly loader: LoaderStore;
  readonly ui: UiStore;
  readonly health: HealthStore;
  readonly overview: OverviewStore;
  readonly import: ImportStore;
  readonly apiClient: BaseApiClient;
  readonly services: ServiceRegistry;
  readonly stores: StoreMap;

  constructor() {
    this.loader = new LoaderStore();
    this.ui = new UiStore();
    this.apiClient = new BaseApiClient({ baseUrl: getApiBaseUrl(), loaderStore: this.loader });
    this.services = {
      health: new HealthService(this.apiClient),
      accounts: new AccountsService(this.apiClient),
    };
    this.health = new HealthStore(this.services.health);
    this.overview = new OverviewStore();
    this.import = new ImportStore();
    this.stores = {
      [StoreName.Loader]: this.loader,
      [StoreName.Ui]: this.ui,
      [StoreName.Health]: this.health,
      [StoreName.Overview]: this.overview,
      [StoreName.Import]: this.import,
    };
  }

  get<K extends StoreName>(name: K): StoreMap[K] {
    return this.stores[name];
  }
}
