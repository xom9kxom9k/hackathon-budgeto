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

  it('sends only the API key payload when the bundle has local recovery data', async () => {
    const bundle = {
      publicKey: 'cfsMfVkpAHmjAe44KThkhWYCiQ1SJpBnJKw2XKseTrc=',
      encryptedPrivateKey: {
        encryptedVaultKey: { ciphertext: 'x', iv: 'x', authTag: 'x' },
        encryptedPrivateKey: { ciphertext: 'x', iv: 'x', authTag: 'x' },
        recoveryVerifier: 'x',
      },
      keyVersion: 1,
      recoveryPhrase: 'local-only recovery phrase',
    };
    const fetchImpl = vi.fn().mockImplementation((input: string) => {
      if (input === '/api/auth/csrf') {
        return Promise.resolve(
          new Response(JSON.stringify({ token: 'csrf-token' }), { status: 200 }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify(bundle), { status: 200 }));
    });
    const service = new VaultService(
      new BaseApiClient({ baseUrl: '/api', loaderStore: new LoaderStore(), fetchImpl }),
    );

    await service.registerKey(bundle);

    const postCall = fetchImpl.mock.calls.find((call) => call[0] === '/api/vault/key/public');
    const request = postCall?.[1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({
      publicKey: bundle.publicKey,
      encryptedPrivateKey: bundle.encryptedPrivateKey,
      keyVersion: bundle.keyVersion,
    });
  });
});
