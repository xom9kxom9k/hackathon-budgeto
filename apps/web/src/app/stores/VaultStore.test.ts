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

it('keeps an unlocked key when loading journal events fails', async () => {
  const store = new VaultStore({
    listEvents: vi.fn().mockRejectedValue(new Error('offline')),
  } as unknown as VaultService);
  store.status = 'unlocked';
  await store.loadEvents();
  expect(store.status).toBe('unlocked');
  expect(store.eventsStatus).toBe('error');
});
it('clears a stale integrity result when verification fails without locking the key', async () => {
  const store = new VaultStore({
    verifyIntegrity: vi.fn().mockRejectedValue(new Error('offline')),
  } as unknown as VaultService);
  store.status = 'unlocked';
  store.integrity = { valid: true, checkedEvents: 0 };
  await store.verify();
  expect(store.status).toBe('unlocked');
  expect(store.integrity).toBeNull();
  expect(store.verificationStatus).toBe('error');
});
