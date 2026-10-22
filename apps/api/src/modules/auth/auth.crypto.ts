import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

interface EncryptedValue {
  ciphertext: string;
  iv: string;
  authTag: string;
}

@Injectable()
export class AuthCryptoService {
  private readonly encryptionKey: Buffer;

  constructor(config: ConfigService) {
    const configuredKey = config.get<string>('AUTH_ENCRYPTION_KEY');
    const isProduction = config.get<string>('NODE_ENV') === 'production';

    if (isProduction && !configuredKey) {
      throw new Error('AUTH_ENCRYPTION_KEY is required in production');
    }

    this.encryptionKey = createHash('sha256')
      .update(configuredKey ?? 'budgeto-local-development-key')
      .digest();
  }

  hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  randomToken(): string {
    return randomBytes(32).toString('base64url');
  }

  randomRecoveryCode(): string {
    return randomBytes(6).toString('hex').toUpperCase();
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  async hashRecoveryCode(code: string): Promise<string> {
    return argon2.hash(code, { type: argon2.argon2id });
  }

  async verifyRecoveryCode(hash: string, code: string): Promise<boolean> {
    return argon2.verify(hash, code);
  }

  encrypt(value: string): EncryptedValue {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);

    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
    };
  }

  decrypt(value: EncryptedValue): string {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(value.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(value.authTag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
