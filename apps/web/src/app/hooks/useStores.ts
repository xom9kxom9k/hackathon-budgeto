import { useRootStore } from '@/app/stores/StoreProvider';
import type { StoreMap } from '@/app/stores/RootStore';
import { StoreName } from '@/app/stores/StoreName';

export function useStores() {
  return useRootStore();
}

export function useStore<K extends StoreName>(name: K): StoreMap[K] {
  return useStores().get(name);
}
