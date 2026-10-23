import { makeAutoObservable } from 'mobx';

import type {
  CategoriesService,
  Category,
  CategoryKind,
} from '@/shared/services/CategoriesService';
import type { RequestStatus } from '@/shared/types/request';

export class CategoriesStore {
  status: RequestStatus = 'idle';
  errorCode: string | null = null;
  categories: Category[] = [];
  mutationStatus: 'idle' | 'saving' | 'success' | 'error' = 'idle';
  mutationErrorCode: string | null = null;
  private loadPromise: Promise<void> | null = null;
  private mutationPromise: Promise<void> | null = null;

  constructor(private readonly categoriesService: CategoriesService) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(kind?: CategoryKind): Promise<void> {
    if (kind) {
      return this.loadFiltered(kind);
    }
    if (this.status === 'success' || this.status === 'empty') return;
    if (this.loadPromise) return this.loadPromise;

    this.status = 'loading';
    this.errorCode = null;
    this.loadPromise = this.categoriesService
      .list()
      .then((categories) => {
        this.categories = categories;
        this.status = categories.length ? 'success' : 'empty';
      })
      .catch((error: unknown) => {
        this.status = 'error';
        this.errorCode = error instanceof Error ? error.message : 'CATEGORIES_LOAD_FAILED';
      })
      .finally(() => {
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  async retry(kind?: CategoryKind): Promise<void> {
    this.status = 'idle';
    await this.load(kind);
  }

  async create(input: { name: string; kind: CategoryKind }): Promise<void> {
    if (this.mutationPromise) return this.mutationPromise;
    return this.mutate(() => this.categoriesService.create(input));
  }

  async update(id: string, input: { name: string }): Promise<void> {
    if (this.mutationPromise) return this.mutationPromise;
    return this.mutate(() => this.categoriesService.update(id, input));
  }

  async archive(id: string): Promise<void> {
    if (this.mutationPromise) return this.mutationPromise;
    return this.mutate(() => this.categoriesService.archive(id));
  }

  byKind(kind: CategoryKind): Category[] {
    return this.categories.filter((category) => category.kind === kind);
  }

  private async loadFiltered(kind: CategoryKind): Promise<void> {
    if (this.categories.some((category) => category.kind === kind)) return;
    if (this.loadPromise) return this.loadPromise;

    this.status = 'loading';
    this.errorCode = null;
    this.loadPromise = this.categoriesService
      .list(kind)
      .then((categories) => {
        const otherCategories = this.categories.filter((category) => category.kind !== kind);
        this.categories = [...otherCategories, ...categories];
        this.status = this.categories.length ? 'success' : 'empty';
      })
      .catch((error: unknown) => {
        this.status = 'error';
        this.errorCode = error instanceof Error ? error.message : 'CATEGORIES_LOAD_FAILED';
      })
      .finally(() => {
        this.loadPromise = null;
      });

    return this.loadPromise;
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
        this.mutationErrorCode = error instanceof Error ? error.message : 'CATEGORY_MUTATION_FAILED';
      })
      .finally(() => {
        this.mutationPromise = null;
      });
    return this.mutationPromise;
  }
}
