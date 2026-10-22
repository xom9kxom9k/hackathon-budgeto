import { z } from 'zod';

import { BaseApiClient } from '@/shared/api/BaseApiClient';

export abstract class BaseApiService {
  protected static readonly prefix: string = '';

  constructor(protected readonly apiClient: BaseApiClient) {}

  protected get<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
    const prefix = (this.constructor as typeof BaseApiService).prefix;
    const normalizedPath = path ? `${prefix}/${path.replace(/^\//, '')}` : prefix;

    return this.apiClient.request(normalizedPath, { method: 'GET', signal }, schema);
  }
}
