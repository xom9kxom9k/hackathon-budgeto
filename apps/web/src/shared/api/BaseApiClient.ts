import { z } from 'zod';

import type { LoaderStore } from '@/app/stores/LoaderStore';

import { ApiError } from './errors';

export interface ApiClientConfig {
  baseUrl: string;
  loaderStore: LoaderStore;
  fetchImpl?: typeof fetch;
}

export class BaseApiClient {
  private readonly baseUrl: string;
  private readonly loaderStore: LoaderStore;
  private readonly fetchImpl: typeof fetch;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.loaderStore = config.loaderStore;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async request<T>(path: string, options: RequestInit = {}, schema?: z.ZodType<T>): Promise<T> {
    const requestId = crypto.randomUUID();
    this.loaderStore.start(requestId);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/${path.replace(/^\//, '')}`, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...options.headers,
        },
      });
      const bodyText = await response.text();
      const payload = bodyText ? this.parseJson(bodyText) : undefined;

      if (!response.ok) {
        throw new ApiError(
          `Request failed with status ${response.status}`,
          response.status,
          payload,
        );
      }

      return schema ? schema.parse(payload) : (payload as T);
    } finally {
      this.loaderStore.finish(requestId);
    }
  }

  private parseJson(value: string): unknown {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
}
