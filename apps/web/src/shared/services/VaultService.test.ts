import { BaseApiClient } from '@/shared/api/BaseApiClient';
import { LoaderStore } from '@/app/stores/LoaderStore';
import { VaultService } from './VaultService';

describe('VaultService', () => {
  it.each(['', 'null'])(
    'reads the key endpoint and accepts an absent bundle (%j)',
    async (body) => {
      const fetchImpl = vi.fn().mockResolvedValue(new Response(body, { status: 200 }));
      const service = new VaultService(
        new BaseApiClient({ baseUrl: '/api', loaderStore: new LoaderStore(), fetchImpl }),
      );
      await expect(service.getKey()).resolves.toBeNull();
      expect(fetchImpl).toHaveBeenCalledWith(
        '/api/vault/key',
        expect.objectContaining({ method: 'GET' }),
      );
    },
  );
  it('does not interpret a failed request as an absent key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }));
    const service = new VaultService(
      new BaseApiClient({ baseUrl: '/api', loaderStore: new LoaderStore(), fetchImpl }),
    );
    await expect(service.getKey()).rejects.toThrow();
  });
});
