import { ProfileStore } from './ProfileStore';
import type { ProfileService, Profile } from '@/shared/services/ProfileService';
const profile: Profile = {
  id: 'u',
  email: 'a@b.test',
  displayName: 'Ada',
  goals: [],
  locale: 'ru',
  timezone: 'UTC',
  createdAt: '2026-01-01',
};
function setup() {
  const service = {
    get: vi.fn().mockResolvedValue(profile),
    update: vi.fn().mockResolvedValue(profile),
    updatePreferences: vi.fn().mockResolvedValue(profile),
  };
  return { service, store: new ProfileStore(service as unknown as ProfileService) };
}
describe('ProfileStore', () => {
  it('coalesces pending loads and caches a successful profile', async () => {
    const { service, store } = setup();
    let resolve!: (value: Profile) => void;
    service.get.mockReturnValue(
      new Promise<Profile>((r) => {
        resolve = r;
      }),
    );
    const a = store.load();
    const b = store.load();
    expect(store.status).toBe('loading');
    expect(service.get).toHaveBeenCalledTimes(1);
    resolve(profile);
    await Promise.all([a, b]);
    await store.load();
    expect(service.get).toHaveBeenCalledTimes(1);
    expect(store.profile).toEqual(profile);
  });
  it.each([new Error('offline'), 'unknown'])(
    'records load failures and permits retry: %s',
    async (error) => {
      const { service, store } = setup();
      service.get.mockRejectedValueOnce(error);
      await store.load();
      expect(store.status).toBe('error');
      expect(store.errorCode).toBe(error instanceof Error ? error.message : 'PROFILE_LOAD_FAILED');
      await store.load();
      expect(store.status).toBe('success');
    },
  );
  it.each(['update', 'updatePreferences'] as const)(
    'tracks %s success, errors and reset',
    async (method) => {
      const { service, store } = setup();
      const mutate = () => store.update('Ada', [], 'ru', 'UTC');
      for (const error of [new Error('failed'), 'unknown']) {
        service[method].mockRejectedValueOnce(error);
        await expect(mutate()).rejects.toBe(error);
        expect(store.mutationStatus).toBe('error');
        expect(store.mutationErrorCode).toBe(
          error instanceof Error ? error.message : 'PROFILE_UPDATE_FAILED',
        );
        store.resetMutation();
        expect(store.mutationStatus).toBe('idle');
        expect(store.mutationErrorCode).toBeNull();
      }
      await mutate();
      expect(store.mutationStatus).toBe('success');
      expect(store.profile).toEqual(profile);
    },
  );

  it('keeps saving and preserves the current profile until preferences succeed', async () => {
    const { service, store } = setup();
    await store.load();
    service.update.mockResolvedValue({ ...profile, displayName: 'Grace' });
    let rejectPreferences!: (error: Error) => void;
    service.updatePreferences.mockReturnValue(
      new Promise<Profile>((_, reject) => {
        rejectPreferences = reject;
      }),
    );
    const saving = store.update('Grace', ['imports'], 'en', 'Europe/Astrakhan');
    await vi.waitFor(() =>
      expect(service.updatePreferences).toHaveBeenCalledWith('en', 'Europe/Astrakhan'),
    );
    expect(store.mutationStatus).toBe('saving');
    expect(store.profile).toEqual(profile);
    const error = new Error('preferences failed');
    rejectPreferences(error);
    await expect(saving).rejects.toBe(error);
    expect(store.mutationStatus).toBe('error');
    expect(store.profile).toEqual(profile);
  });
});
