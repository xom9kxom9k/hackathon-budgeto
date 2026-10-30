import { beforeEach, describe, expect, it } from 'vitest';

import { decryptImportStaging, encryptImportStaging } from './import-staging-crypto';
import { ImportErrorCode } from './import-parser/import-errors';

describe('import staging encryption', () => {
  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.AUTH_ENCRYPTION_KEY;
    delete process.env.IMPORT_STAGING_ALLOW_PLAINTEXT;
    delete process.env.IMPORT_STAGING_KEY_VERSION;
  });

  it('round-trips plaintext and does not store it directly', () => {
    const content = Buffer.from('%PDF-1.7 private statement', 'utf8');
    const envelope = encryptImportStaging(content);

    expect(envelope).not.toEqual(content);
    expect(decryptImportStaging(envelope)).toEqual(content);
  });

  it('rejects tampered ciphertext', () => {
    const envelope = encryptImportStaging(Buffer.from('statement'));
    envelope[envelope.length - 1] ^= 1;

    expect(() => decryptImportStaging(envelope)).toThrow(
      ImportErrorCode.IMPORT_STAGING_DECRYPT_FAILED,
    );
  });

  it('requires a configured key in production', () => {
    process.env.NODE_ENV = 'production';

    expect(() => encryptImportStaging(Buffer.from('statement'))).toThrow(
      ImportErrorCode.IMPORT_STAGING_KEY_REQUIRED,
    );
  });

  it('rejects placeholder and short production keys', () => {
    process.env.NODE_ENV = 'production';
    for (const key of [
      'short',
      'replace-with-a-long-random-secret',
      'budgeto-local-development-key',
    ]) {
      process.env.AUTH_ENCRYPTION_KEY = key;
      expect(() => encryptImportStaging(Buffer.from('statement'))).toThrow(
        ImportErrorCode.IMPORT_STAGING_KEY_REQUIRED,
      );
    }
  });

  it('rejects plaintext in production even when compatibility is requested', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_ENCRYPTION_KEY = 'a'.repeat(64);
    process.env.IMPORT_STAGING_ALLOW_PLAINTEXT = 'true';
    expect(() => decryptImportStaging(Buffer.from('statement'))).toThrow(
      ImportErrorCode.IMPORT_STAGING_DECRYPT_FAILED,
    );
  });

  it('only permits plaintext compatibility mode explicitly outside production', () => {
    process.env.IMPORT_STAGING_ALLOW_PLAINTEXT = 'true';
    const content = Buffer.from('legacy staging');

    expect(decryptImportStaging(content)).toEqual(content);
  });

  it('rejects an envelope from a different staging key version', () => {
    const envelope = encryptImportStaging(Buffer.from('statement'));
    process.env.IMPORT_STAGING_KEY_VERSION = '2';

    expect(() => decryptImportStaging(envelope)).toThrow(
      ImportErrorCode.IMPORT_STAGING_KEY_VERSION_UNSUPPORTED,
    );
  });
});
