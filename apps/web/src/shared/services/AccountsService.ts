import { z } from 'zod';

import type { Account } from '@/entities/account/model/types';
import { BaseApiClient } from '@/shared/api/BaseApiClient';

import { BaseApiService } from './BaseApiService';

const accountResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    currency: z.string(),
    archivedAt: z.string().nullable().optional(),
  }),
);
const accountMutationSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.string(),
  archivedAt: z.string().nullable(),
});

export class AccountsService extends BaseApiService {
  constructor(apiClient: BaseApiClient) {
    super(apiClient, '/accounts');
  }

  async list(signal?: AbortSignal): Promise<Account[]> {
    const response = await this.get(accountResponseSchema, signal);

    return response.map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
    }));
  }

  create(input: { name: string; currency: string }): Promise<Account> {
    return this.post('', input, accountMutationSchema).then(({ id, name, currency }) => ({
      id,
      name,
      currency,
    }));
  }

  update(id: string, input: { name: string }): Promise<Account> {
    return this.patch(`/${encodeURIComponent(id)}`, input, accountMutationSchema).then(
      ({ id: accountId, name, currency }) => ({ id: accountId, name, currency }),
    );
  }

  archive(id: string): Promise<void> {
    return this.post(`/${encodeURIComponent(id)}/archive`, {}, z.unknown()).then(() => undefined);
  }
}
