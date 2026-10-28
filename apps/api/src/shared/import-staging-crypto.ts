import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';

import { ImportError, ImportErrorCode } from './import-parser/import-errors';

const magic = Buffer.from('BUDGETO-STAGING\u0001', 'ascii');
const envelopeVersion = 1;
const ivLength = 12;
const authTagLength = 16;

function currentKeyVersion(): number {
  const value = Number(process.env.IMPORT_STAGING_KEY_VERSION ?? envelopeVersion);
  if (!Number.isInteger(value) || value < 1 || value > 255) {
    throw new ImportError(ImportErrorCode.IMPORT_STAGING_KEY_VERSION_UNSUPPORTED);
  }
  return value;
}

function encryptionKey(): Buffer {
  const configuredKey = process.env.AUTH_ENCRYPTION_KEY;
  if (process.env.NODE_ENV === 'production' && !configuredKey) {
    throw new ImportError(ImportErrorCode.IMPORT_STAGING_KEY_REQUIRED);
  }
  const rootKey = createHash('sha256')
    .update(configuredKey ?? 'budgeto-local-development-key')
    .digest();
  return Buffer.from(
    hkdfSync(
      'sha256',
      rootKey,
      Buffer.alloc(0),
      `budgeto/import-staging/aes-256-gcm/v${currentKeyVersion()}`,
      32,
    ),
  );
}

export function assertImportStagingKey(): void {
  encryptionKey();
}

export function encryptImportStaging(content: Buffer): Buffer {
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(content), cipher.final()]);
  return Buffer.concat([
    magic,
    Buffer.from([currentKeyVersion()]),
    iv,
    cipher.getAuthTag(),
    ciphertext,
  ]);
}

export function decryptImportStaging(envelope: Buffer): Buffer {
  const minimumLength = magic.length + 1 + ivLength + authTagLength;
  if (envelope.subarray(0, magic.length).equals(magic) && envelope.length >= minimumLength) {
    try {
      const version = envelope.readUInt8(magic.length);
      if (version !== currentKeyVersion()) {
        throw new ImportError(ImportErrorCode.IMPORT_STAGING_KEY_VERSION_UNSUPPORTED);
      }
      const ivStart = magic.length + 1;
      const authTagStart = ivStart + ivLength;
      const decipher = createDecipheriv(
        'aes-256-gcm',
        encryptionKey(),
        envelope.subarray(ivStart, authTagStart),
      );
      decipher.setAuthTag(envelope.subarray(authTagStart, authTagStart + authTagLength));
      return Buffer.concat([
        decipher.update(envelope.subarray(authTagStart + authTagLength)),
        decipher.final(),
      ]);
    } catch (error) {
      if (error instanceof ImportError) throw error;
      throw new ImportError(ImportErrorCode.IMPORT_STAGING_DECRYPT_FAILED, undefined, {
        cause: error,
      });
    }
  }

  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.IMPORT_STAGING_ALLOW_PLAINTEXT === 'true'
  ) {
    return envelope;
  }
  throw new ImportError(ImportErrorCode.IMPORT_STAGING_DECRYPT_FAILED);
}
