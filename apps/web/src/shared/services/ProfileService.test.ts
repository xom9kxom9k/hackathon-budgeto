import { ProfileService } from './ProfileService';
import { BaseApiClient } from '@/shared/api/BaseApiClient';
import { LoaderStore } from '@/app/stores/LoaderStore';
it('loads and saves the profile through the actual HTTP client and validates the response', async () => {
  const profile = {
    id: 'u',
    email: 'a@b.test',
    displayName: 'Ada',
    goals: [],
    locale: 'ru',
    timezone: 'UTC',
    createdAt: '2026-01-01',
  };
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async (url) =>
        new Response(
          JSON.stringify(String(url).endsWith('/auth/csrf') ? { token: 'token' } : profile),
        ),
    );
  const service = new ProfileService(
    new BaseApiClient({ baseUrl: '/api', loaderStore: new LoaderStore(), fetchImpl }),
  );
  await expect(service.get()).resolves.toEqual(profile);
  await expect(service.update('Ada', ['imports'])).resolves.toEqual(profile);
  await expect(service.updatePreferences('en', 'Europe/Astrakhan')).resolves.toEqual(profile);
  expect(fetchImpl.mock.calls[2]).toEqual([
    '/api/profile',
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ displayName: 'Ada', goals: ['imports'] }),
    }),
  ]);
  expect(fetchImpl.mock.calls[3]).toEqual([
    '/api/profile/preferences',
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ locale: 'en', timezone: 'Europe/Astrakhan' }),
    }),
  ]);
});
