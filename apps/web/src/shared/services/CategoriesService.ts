import { z } from 'zod';

import { BaseApiClient } from '@/shared/api/BaseApiClient';

import { BaseApiService } from './BaseApiService';

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['income', 'expense']),
});

const categoriesSchema = z.array(categorySchema);

export type Category = z.infer<typeof categorySchema>;
export type CategoryKind = Category['kind'];

export class CategoriesService extends BaseApiService {
  constructor(apiClient: BaseApiClient) {
    super(apiClient, '/categories');
  }

  list(kind?: CategoryKind, signal?: AbortSignal): Promise<Category[]> {
    return kind
      ? this.get(`?kind=${encodeURIComponent(kind)}`, categoriesSchema, signal)
      : this.get(categoriesSchema, signal);
  }
}
