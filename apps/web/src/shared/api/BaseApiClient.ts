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
  private csrfToken: string | null = null;
  private csrfRequest: Promise<void> | null = null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.loaderStore = config.loaderStore;
    this.fetchImpl = (config.fetchImpl ?? globalThis.fetch).bind(globalThis);
  }

  async request<T>(path: string, options: RequestInit = {}, schema?: z.ZodType<T>): Promise<T> {
    const method = (options.method ?? 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD' && !path.endsWith('/auth/csrf')) {
      await this.ensureCsrfToken();
    }

    const requestId = crypto.randomUUID();
    this.loaderStore.start(requestId);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/${path.replace(/^\//, '')}`, {
        ...options,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {}),
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

  private async ensureCsrfToken(): Promise<void> {
    if (this.csrfToken) return;
    if (this.csrfRequest) return this.csrfRequest;

    this.csrfRequest = this.request(
      '/auth/csrf',
      { method: 'GET' },
      z.object({ token: z.string() }),
    )
      .then(({ token }) => {
        this.csrfToken = token;
      })
      .finally(() => {
        this.csrfRequest = null;
      });

    return this.csrfRequest;
  }

  private parseJson(value: string): unknown {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
}
