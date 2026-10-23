import type { VaultService } from '@/shared/services/VaultService';
import { VaultStore } from './VaultStore';

describe('VaultStore', () => {
  it('starts locked when the server has a key bundle', async () => {
    const store = new VaultStore({
      getKey: vi.fn().mockResolvedValue({
        publicKey: 'public-key',
        encryptedPrivateKey: {
          encryptedVaultKey: { ciphertext: 'x', iv: 'x', authTag: 'x' },
          encryptedPrivateKey: { ciphertext: 'x', iv: 'x', authTag: 'x' },
          recoveryVerifier: 'x',
        },
        keyVersion: 1,
      }),
    } as unknown as VaultService);

    await store.bootstrap();

    expect(store.status).toBe('locked');
  });

  it('starts uninitialized when no key bundle exists', async () => {
    const store = new VaultStore({
      getKey: vi.fn().mockResolvedValue(null),
    } as unknown as VaultService);

    await store.bootstrap();

    expect(store.status).toBe('uninitialized');
  });
});
