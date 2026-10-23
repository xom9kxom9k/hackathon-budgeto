import { createHash, createPublicKey, verify } from 'node:crypto';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export function canonicalize(value: Record<string, unknown>): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === 'object') {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, entry]) => [key, normalize(entry)]),
      );
    }
    return input;
  };

  return JSON.stringify(normalize(value));
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
  operationId?: string;
  iv?: string;
  authTag?: string;
  keyVersion?: number;
}): string {
  return sha256(canonicalize(input));
}

export function proofMessage(input: {
  claimDigest: string;
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}): string {
  return canonicalize(input);
}

export const VAULT_GENESIS_HASH = sha256('budgeto:vault:genesis:v1');
