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

  it('refreshes the CSRF token once after an expired token', async () => {
    const loaderStore = new LoaderStore();
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'stale-token' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'AUTH_CSRF_INVALID' }), { status: 403 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'fresh-token' }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = new BaseApiClient({ baseUrl: '/api', fetchImpl, loaderStore });

    await expect(
      client.request(
        '/profile',
        { method: 'PATCH', body: JSON.stringify({ displayName: 'Ada', goals: [] }) },
        z.object({ ok: z.boolean() }),
      ),
    ).resolves.toEqual({ ok: true });

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(fetchImpl.mock.calls[3][1]).toMatchObject({
      headers: expect.objectContaining({ 'X-CSRF-Token': 'fresh-token' }),
    });
  });
});

describe('CSRF recovery boundaries', () => {
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), { status });
  it('reuses the cached token and preserves mutation payload and headers during retry', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ token: 'old' }))
      .mockResolvedValueOnce(json({ ok: true }))
      .mockResolvedValueOnce(json({ code: 'AUTH_CSRF_INVALID' }, 403))
      .mockResolvedValueOnce(json({ token: 'new' }))
      .mockResolvedValueOnce(json({ ok: true }));
    const loader = new LoaderStore();
    const client = new BaseApiClient({ baseUrl: '/api', fetchImpl, loaderStore: loader });
    await client.request('/profile', { method: 'PATCH' });
    const options = {
      method: 'PATCH',
      body: '{"name":"Ada"}',
      headers: { 'Content-Type': 'application/json' },
    };
    await client.request('/profile/preferences', options);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(fetchImpl.mock.calls[4]).toEqual([
      '/api/profile/preferences',
      expect.objectContaining({
        ...options,
        credentials: 'include',
        headers: expect.objectContaining({ ...options.headers, 'X-CSRF-Token': 'new' }),
      }),
    ]);
    expect(loader.isLoading).toBe(false);
  });
  it('stops after a second CSRF rejection', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ token: 'old' }))
      .mockResolvedValueOnce(json({ code: 'AUTH_CSRF_INVALID' }, 403))
      .mockResolvedValueOnce(json({ token: 'new' }))
      .mockResolvedValueOnce(json({ code: 'AUTH_CSRF_INVALID' }, 403));
    const loader = new LoaderStore();
    const client = new BaseApiClient({ baseUrl: '/api', fetchImpl, loaderStore: loader });
    await expect(client.request('/profile', { method: 'PATCH' })).rejects.toMatchObject({
      code: 'AUTH_CSRF_INVALID',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(loader.isLoading).toBe(false);
  });
  it.each([401, 500, 403])('does not refresh on unrelated HTTP %s', async (status) => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ token: 'token' }))
      .mockResolvedValueOnce(json({ code: 'OTHER' }, status));
    const client = new BaseApiClient({
      baseUrl: '/api',
      fetchImpl,
      loaderStore: new LoaderStore(),
    });
    await expect(client.request('/profile', { method: 'PATCH' })).rejects.toMatchObject({ status });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it('shares concurrent token acquisition and recovers from failed acquisition', async () => {
    let resolve!: (response: Response) => void;
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockReturnValueOnce(
        new Promise<Response>((r) => {
          resolve = r;
        }),
      )
      .mockImplementation(async () => json({ ok: true }));
    const client = new BaseApiClient({
      baseUrl: '/api',
      fetchImpl,
      loaderStore: new LoaderStore(),
    });
    const a = client.request('/a', { method: 'POST' });
    const b = client.request('/b', { method: 'DELETE' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    resolve(json({ token: 'shared' }));
    await Promise.all([a, b]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
  it('clears failed CSRF acquisition and allows a later request', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(json({ token: 'new' }))
      .mockResolvedValueOnce(json({ ok: true }));
    const loader = new LoaderStore();
    const client = new BaseApiClient({ baseUrl: '/api', fetchImpl, loaderStore: loader });
    await expect(client.request('/a', { method: 'POST' })).rejects.toThrow('offline');
    expect(loader.isLoading).toBe(false);
    await expect(client.request('/a', { method: 'POST' })).resolves.toEqual({ ok: true });
  });
  it('propagates a failed refresh without replaying the mutation', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ token: 'old' }))
      .mockResolvedValueOnce(json({ code: 'AUTH_CSRF_INVALID' }, 403))
      .mockRejectedValueOnce(new Error('refresh failed'));
    const loader = new LoaderStore();
    const client = new BaseApiClient({ baseUrl: '/api', fetchImpl, loaderStore: loader });
    await expect(client.request('/a', { method: 'POST' })).rejects.toThrow('refresh failed');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(loader.isLoading).toBe(false);
  });
  it.each(['GET', 'HEAD', 'OPTIONS'])('does not acquire CSRF for %s', async (method) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 200 }));
    const client = new BaseApiClient({
      baseUrl: '/api',
      fetchImpl,
      loaderStore: new LoaderStore(),
    });
    await expect(client.request('/a', { method })).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('returns non-JSON text and rejects invalid response schemas', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('plain'))
      .mockResolvedValueOnce(json({ bad: true }));
    const client = new BaseApiClient({
      baseUrl: '/api',
      fetchImpl,
      loaderStore: new LoaderStore(),
    });
    await expect(client.request('/a')).resolves.toBe('plain');
    await expect(client.request('/a', {}, z.object({ ok: z.boolean() }))).rejects.toThrow();
  });
});
