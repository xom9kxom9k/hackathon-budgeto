import type { ImportConfirmationClaims, VaultProof } from '@/shared/services/ImportService';
import type { EncryptedPrivateKeyBundle } from '@/shared/services/VaultService';

interface EncryptedValue {
  ciphertext: string;
  iv: string;
  authTag: string;
}

interface RuntimeVault {
  vaultKey: CryptoKey;
  privateKey: CryptoKey;
  publicKey: string;
  keyVersion: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ED25519 = { name: 'Ed25519' } as Algorithm;

function toBase64(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function toBase64Url(value: Uint8Array): string {
  return toBase64(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return new Uint8Array(fromBase64(padded));
}

async function digest(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function proofMessage(input: {
  claimDigest: string;
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}): string {
  return JSON.stringify(input, Object.keys(input).sort());
}

async function encrypt(key: CryptoKey, value: BufferSource): Promise<EncryptedValue> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, value),
  );
  return {
    ciphertext: toBase64(encrypted.slice(0, -16)),
    iv: toBase64(iv),
    authTag: toBase64(encrypted.slice(-16)),
  };
}

async function decrypt(key: CryptoKey, value: EncryptedValue): Promise<ArrayBuffer> {
  const ciphertext = fromBase64(value.ciphertext);
  const authTag = fromBase64(value.authTag);
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(value.iv) as unknown as BufferSource, tagLength: 128 },
    key,
    combined as unknown as BufferSource,
  );
}

export class VaultCrypto {
  private runtime: RuntimeVault | null = null;

  async createBundle(): Promise<{
    publicKey: string;
    encryptedPrivateKey: EncryptedPrivateKeyBundle;
    recoveryPhrase: string;
    keyVersion: number;
  }> {
    const vaultKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    const keyPair = (await crypto.subtle.generateKey(ED25519, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair;
    const publicKey = toBase64(await crypto.subtle.exportKey('raw', keyPair.publicKey));
    const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const recoveryBytes = crypto.getRandomValues(new Uint8Array(32));
    const recoveryPhrase =
      toBase64Url(recoveryBytes)
        .match(/.{1,8}/g)
        ?.join(' ') ?? '';
    const recoveryKey = await crypto.subtle.importKey('raw', recoveryBytes, 'AES-GCM', false, [
      'encrypt',
      'decrypt',
    ]);
    const rawVaultKey = await crypto.subtle.exportKey('raw', vaultKey);
    const encryptedVaultKey = await encrypt(recoveryKey, rawVaultKey);
    const encryptedPrivateKey = await encrypt(vaultKey, privateKey);
    this.runtime = { vaultKey, privateKey: keyPair.privateKey, publicKey, keyVersion: 1 };
    return {
      publicKey,
      encryptedPrivateKey: {
        encryptedVaultKey,
        encryptedPrivateKey,
        recoveryVerifier: await digest(recoveryPhrase.replace(/ /g, '')),
      },
      recoveryPhrase,
      keyVersion: 1,
    };
  }

  async unlock(
    bundle: {
      publicKey: string;
      encryptedPrivateKey: EncryptedPrivateKeyBundle;
      keyVersion: number;
    },
    recoveryPhrase: string,
  ): Promise<void> {
    const normalized = recoveryPhrase.replace(/ /g, '');
    const verifier = await digest(normalized);
    if (verifier !== bundle.encryptedPrivateKey.recoveryVerifier) {
      throw new Error('VAULT_RECOVERY_INVALID');
    }
    const recoveryKey = await crypto.subtle.importKey(
      'raw',
      fromBase64Url(normalized) as unknown as BufferSource,
      'AES-GCM',
      false,
      ['encrypt', 'decrypt'],
    );
    const rawVaultKey = await decrypt(recoveryKey, bundle.encryptedPrivateKey.encryptedVaultKey);
    const vaultKey = await crypto.subtle.importKey('raw', rawVaultKey, 'AES-GCM', false, [
      'encrypt',
      'decrypt',
    ]);
    const privateBytes = await decrypt(vaultKey, bundle.encryptedPrivateKey.encryptedPrivateKey);
    const privateKey = await crypto.subtle.importKey('pkcs8', privateBytes, ED25519, false, [
      'sign',
    ]);
    this.runtime = {
      vaultKey,
      privateKey,
      publicKey: bundle.publicKey,
      keyVersion: bundle.keyVersion,
    };
  }

  lock(): void {
    this.runtime = null;
  }

  get isUnlocked(): boolean {
    return this.runtime !== null;
  }

  async createProof(claim: ImportConfirmationClaims['claims'][number]): Promise<VaultProof> {
    if (!this.runtime) throw new Error('VAULT_KEY_REQUIRED');
    const encrypted = await encrypt(
      this.runtime.vaultKey,
      encoder.encode(claim.canonicalPayload) as unknown as BufferSource,
    );
    const signature = await crypto.subtle.sign(
      ED25519,
      this.runtime.privateKey,
      encoder.encode(
        proofMessage({
          claimDigest: claim.claimDigest,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          keyVersion: this.runtime.keyVersion,
        }),
      ) as unknown as BufferSource,
    );
    return {
      sourceRow: claim.sourceRow,
      fingerprint: claim.fingerprint,
      payloadHash: claim.payloadHash,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      signature: toBase64(signature),
      publicKeyId: await digest(this.runtime.publicKey),
      keyVersion: this.runtime.keyVersion,
    };
  }

  async decryptSnapshot(event: {
    ciphertext: string;
    iv: string;
    authTag: string;
  }): Promise<string> {
    if (!this.runtime) throw new Error('VAULT_KEY_REQUIRED');
    const bytes = await decrypt(this.runtime.vaultKey, event);
    return decoder.decode(bytes);
  }
}
