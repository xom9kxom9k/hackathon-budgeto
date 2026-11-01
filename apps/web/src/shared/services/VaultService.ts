import { z } from 'zod';

import { BaseApiClient } from '@/shared/api/BaseApiClient';
import { BaseApiService } from './BaseApiService';

const encryptedValueSchema = z.object({
  ciphertext: z.string(),
  iv: z.string(),
  authTag: z.string(),
});
const encryptedPrivateKeyBundleSchema = z.object({
  encryptedVaultKey: encryptedValueSchema,
  encryptedPrivateKey: encryptedValueSchema,
  recoveryVerifier: z.string(),
});
const keyPayloadSchema = z.object({
  publicKey: z.string(),
  encryptedPrivateKey: encryptedPrivateKeyBundleSchema,
  keyVersion: z.number(),
});
const keySchema = keyPayloadSchema.nullish().transform((value) => value ?? null);
const eventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  sequence: z.string(),
  eventType: z.string(),
  transactionId: z.string(),
  importJobId: z.string().nullable(),
  importRow: z.number().nullable(),
  ciphertext: z.string(),
  iv: z.string(),
  authTag: z.string(),
  keyVersion: z.number(),
  payloadHash: z.string(),
  fingerprint: z.string(),
  claimDigest: z.string(),
  signature: z.string(),
  publicKeyId: z.string(),
  previousHash: z.string(),
  eventHash: z.string(),
  schemaVersion: z.number(),
  createdAt: z.string(),
});
const integritySchema = z.object({
  valid: z.boolean(),
  checkedEvents: z.number(),
  lastSequence: z.string().optional(),
  lastHash: z.string().optional(),
  firstInvalidEventId: z.string().optional(),
  reason: z.string().optional(),
});

export interface EncryptedPrivateKeyBundle {
  encryptedVaultKey: z.infer<typeof encryptedValueSchema>;
  encryptedPrivateKey: z.infer<typeof encryptedValueSchema>;
  recoveryVerifier: string;
}
export interface VaultKeyBundle {
  publicKey: string;
  encryptedPrivateKey: EncryptedPrivateKeyBundle;
  keyVersion: number;
}
export type VaultEvent = z.infer<typeof eventSchema>;
export type VaultIntegrity = z.infer<typeof integritySchema>;
export class VaultService extends BaseApiService {
  constructor(apiClient: BaseApiClient) {
    super(apiClient, '/vault');
  }

  getKey(): Promise<VaultKeyBundle | null> {
    return this.get('/key', keySchema).then((value) => value as VaultKeyBundle | null);
  }

  registerKey(bundle: {
    publicKey: string;
    encryptedPrivateKey: EncryptedPrivateKeyBundle;
    keyVersion: number;
  }): Promise<NonNullable<VaultKeyBundle>> {
    return this.post(
      '/key/public',
      {
        publicKey: bundle.publicKey,
        encryptedPrivateKey: bundle.encryptedPrivateKey,
        keyVersion: bundle.keyVersion,
      },
      keyPayloadSchema,
    );
  }

  listEvents(): Promise<VaultEvent[]> {
    return this.get('/events', z.array(eventSchema));
  }

  getEvent(eventId: string): Promise<VaultEvent> {
    return this.get(`/events/${eventId}`, eventSchema);
  }

  verifyIntegrity(): Promise<VaultIntegrity> {
    return this.get('/integrity', integritySchema);
  }
}
