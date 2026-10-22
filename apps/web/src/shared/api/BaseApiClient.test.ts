import { z } from 'zod';

import { BaseApiClient } from './BaseApiClient';
import { ApiError } from './errors';
import { LoaderStore } from '@/app/stores/LoaderStore';

describe('BaseApiClient', () => {
  it('starts and finishes the loader around a successful validated request', async () => {
    const loaderStore = new LoaderStore();
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => {
      await Promise.resolve();
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
    });
    const client = new BaseApiClient({ baseUrl: '/api/', fetchImpl, loaderStore });

    const response = await client.request(
      '/health',
      { method: 'GET' },
      z.object({ status: z.string() }),
    );

    expect(response.status).toBe('ok');
    expect(fetchImpl).toHaveBeenCalledWith('/api/health', expect.any(Object));
    expect(loaderStore.isLoading).toBe(false);
  });

  it('finishes the loader when the server responds with an error', async () => {
    const loaderStore = new LoaderStore();
    const client = new BaseApiClient({
      baseUrl: '/api',
      loaderStore,
      fetchImpl: vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(JSON.stringify({ message: 'nope' }), { status: 500 })),
    });

    await expect(client.request('/health')).rejects.toBeInstanceOf(ApiError);
    expect(loaderStore.isLoading).toBe(false);
  });
});
