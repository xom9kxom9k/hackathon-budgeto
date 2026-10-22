import { z } from 'zod';

import type { Account } from '@/entities/account/model/types';

import { BaseApiService } from './BaseApiService';

const accountResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    currency: z.string(),
  }),
);

export class AccountsService extends BaseApiService {
  static override readonly prefix = '/accounts';

  async list(signal?: AbortSignal): Promise<Account[]> {
    const response = await this.get('', accountResponseSchema, signal);

    return response.map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
    }));
  }
}
