import { generateKeyPairSync, sign } from 'node:crypto';

import {
  chainDigest,
  canonicalize,
  proofMessage,
  publicKeyId,
  sha256,
  verifyEd25519,
} from './vault.crypto';

describe('vault crypto', () => {
  it('canonicalizes equivalent objects deterministically', () => {
    expect(canonicalize({ z: 2, a: 1 })).toBe(canonicalize({ a: 1, z: 2 }));
    expect(sha256(canonicalize({ z: 2, a: 1 }))).toBe(sha256(canonicalize({ a: 1, z: 2 })));
  });

  it('verifies an Ed25519 signature and rejects changed claims', () => {
    const keyPair = generateKeyPairSync('ed25519');
    const spki = keyPair.publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
    const rawPublicKey = spki.subarray(-32).toString('base64');
    const message = 'claim-digest';
    const signature = sign(null, Buffer.from(message), keyPair.privateKey).toString('base64');

    expect(publicKeyId(rawPublicKey)).toHaveLength(64);
    expect(verifyEd25519(rawPublicKey, message, signature)).toBe(true);
    expect(verifyEd25519(rawPublicKey, 'changed-claim', signature)).toBe(false);
  });

  it('changes the chain digest when the previous event changes', () => {
    const input = {
      schemaVersion: 1,
      userId: 'user-1',
      sequence: '1',
      eventType: 'transaction_confirmed',
      transactionId: 'transaction-1',
      payloadHash: 'payload',
      claimDigest: 'claim',
      ciphertext: 'ciphertext',
      previousHash: 'genesis',
    };

    expect(chainDigest(input)).not.toBe(chainDigest({ ...input, previousHash: 'changed' }));
  });

  it('binds proofs to ciphertext, IV, auth tag and key version', () => {
    const message = proofMessage({
      claimDigest: 'claim',
      ciphertext: 'ciphertext',
      iv: 'iv',
      authTag: 'tag',
      keyVersion: 1,
    });

    expect(message).not.toBe(
      proofMessage({
        claimDigest: 'claim',
        ciphertext: 'changed',
        iv: 'iv',
        authTag: 'tag',
        keyVersion: 1,
      }),
    );
  });
});
