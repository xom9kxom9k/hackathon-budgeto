import { z } from 'zod';

import { BaseApiClient } from './BaseApiClient';
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
        .mockResolvedValue(
          new Response(JSON.stringify({ code: 'AUTH_CSRF_INVALID' }), { status: 403 }),
        ),
    });

    await expect(client.request('/health')).rejects.toMatchObject({
      code: 'AUTH_CSRF_INVALID',
    });
    expect(loaderStore.isLoading).toBe(false);
  });

  it('gets a CSRF token before a write request', async () => {
    const loaderStore = new LoaderStore();
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ challengeToken: 'challenge' }), { status: 200 }),
      );
    const client = new BaseApiClient({ baseUrl: '/api', fetchImpl, loaderStore });

    await client.request(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email: 'test@example.com' }) },
      z.object({ challengeToken: z.string() }),
    );

    expect(fetchImpl.mock.calls[0][0]).toBe('/api/auth/csrf');
    expect(fetchImpl.mock.calls[1][0]).toBe('/api/auth/register');
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({
      credentials: 'include',
      headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-token' }),
    });
  });
});
