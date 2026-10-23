import { z } from 'zod';

import { BaseApiClient } from '@/shared/api/BaseApiClient';

import { BaseApiService } from './BaseApiService';

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['income', 'expense']),
});

const categoriesSchema = z.array(categorySchema);
const categoryMutationSchema = categorySchema.extend({ archivedAt: z.string().nullable() });

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

  create(input: { name: string; kind: CategoryKind }): Promise<Category> {
    return this.post('', input, categoryMutationSchema).then(({ id, name, kind }) => ({ id, name, kind }));
  }

  update(id: string, input: { name: string }): Promise<Category> {
    return this.patch(`/${encodeURIComponent(id)}`, input, categoryMutationSchema).then(({ id: categoryId, name, kind }) => ({ id: categoryId, name, kind }));
  }

  archive(id: string): Promise<void> {
    return this.post(`/${encodeURIComponent(id)}/archive`, {}, z.unknown()).then(() => undefined);
  }
}
