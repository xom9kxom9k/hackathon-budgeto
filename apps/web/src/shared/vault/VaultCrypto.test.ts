// @vitest-environment node
import { VaultCrypto } from './VaultCrypto';

it('recovers the signing key, decrypts its snapshots and rejects a wrong recovery key or modified ciphertext', async () => {
  const vault = new VaultCrypto();
  const bundle = await vault.createBundle();
  const canonicalPayload = JSON.stringify({ date: '2026-11-01', amount: '125.50', note: 'Coffee' });
  const proof = await vault.createProof({
    sourceRow: 1,
    operationId: 'demo',
    fingerprint: 'fingerprint',
    payloadHash: 'payload',
    claimDigest: 'claim',
    canonicalPayload,
  });
  expect(proof.ciphertext).not.toContain('Coffee');
  vault.lock();
  await expect(vault.decryptSnapshot(proof)).rejects.toThrow('VAULT_KEY_REQUIRED');
  await expect(vault.unlock(bundle, 'wrong')).rejects.toThrow('VAULT_RECOVERY_INVALID');
  await vault.unlock(bundle, bundle.recoveryPhrase);
  await expect(vault.decryptSnapshot(proof)).resolves.toBe(canonicalPayload);
  const changed = {
    ...proof,
    ciphertext: (proof.ciphertext[0] === 'A' ? 'B' : 'A') + proof.ciphertext.slice(1),
  };
  await expect(vault.decryptSnapshot(changed)).rejects.toThrow();
});
