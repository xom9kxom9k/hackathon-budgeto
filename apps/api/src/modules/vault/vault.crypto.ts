import { createHash, createPublicKey, verify } from 'node:crypto';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export function canonicalize(value: Record<string, unknown>): string {
  return JSON.stringify(value, Object.keys(value).sort());
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function publicKeyId(publicKey: string): string {
  return sha256(publicKey);
}

export function verifyEd25519(
  publicKeyBase64: string,
  message: string,
  signatureBase64: string,
): boolean {
  const rawPublicKey = Buffer.from(publicKeyBase64, 'base64');
  const key = createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, rawPublicKey]),
    format: 'der',
    type: 'spki',
  });
  return verify(null, Buffer.from(message, 'utf8'), key, Buffer.from(signatureBase64, 'base64'));
}

export function chainDigest(input: {
  schemaVersion: number;
  userId: string;
  sequence: string;
  eventType: string;
  transactionId: string;
  payloadHash: string;
  claimDigest: string;
  ciphertext: string;
  previousHash: string;
}): string {
  return sha256(canonicalize(input));
}

export const VAULT_GENESIS_HASH = sha256('budgeto:vault:genesis:v1');
