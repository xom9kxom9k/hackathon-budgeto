import { z } from 'zod';

import { BaseApiClient } from '@/shared/api/BaseApiClient';

export abstract class BaseApiService {
  protected constructor(
    protected readonly apiClient: BaseApiClient,
    private readonly prefix: string,
  ) {}

  /**
   * Requests the service root. Example: `this.get(healthSchema, signal)`.
   */
  protected get<T>(schema: z.ZodType<T>, signal?: AbortSignal): Promise<T>;

  /**
   * Requests a path relative to the service prefix. Example: `this.get('/recent', schema, signal)`.
   */
  protected get<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T>;
  protected get<T>(
    pathOrSchema: string | z.ZodType<T>,
    schemaOrSignal?: z.ZodType<T> | AbortSignal,
    signal?: AbortSignal,
  ): Promise<T> {
    const hasPath = typeof pathOrSchema === 'string';
    const path = hasPath ? pathOrSchema : '';
    const schema = (hasPath ? schemaOrSignal : pathOrSchema) as z.ZodType<T>;
    const requestSignal = hasPath ? signal : (schemaOrSignal as AbortSignal | undefined);
    const normalizedPath = path ? `${this.prefix}/${path.replace(/^\//, '')}` : this.prefix;

    return this.apiClient.request(normalizedPath, { method: 'GET', signal: requestSignal }, schema);
  }

  protected post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
    const normalizedPath = path ? `${this.prefix}/${path.replace(/^\//, '')}` : this.prefix;

    return this.apiClient.request(
      normalizedPath,
      {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      schema,
    );
  }

  protected request<T>(path: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> {
    const normalizedPath = path ? `${this.prefix}/${path.replace(/^\//, '')}` : this.prefix;
    return this.apiClient.request(normalizedPath, options, schema);
  }
}
