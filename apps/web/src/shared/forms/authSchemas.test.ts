import { I18nKey } from '@/shared/i18n';

import { recoverySchema, registerSchema, totpSchema } from './authSchemas';

describe('auth schemas', () => {
  it('returns translation keys for registration validation errors', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'short',
      passwordConfirm: 'different',
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const messages = result.error.issues.map((issue) => issue.message);
    expect(messages).toContain(I18nKey.AuthValidationEmailInvalid);
    expect(messages).toContain(I18nKey.AuthValidationPasswordMin);
    expect(messages).toContain(I18nKey.AuthValidationPasswordMismatch);
  });

  it('accepts six-digit authenticator codes and rejects other values', () => {
    expect(totpSchema.safeParse({ code: '123456' }).success).toBe(true);
    expect(totpSchema.safeParse({ code: '12345a' }).success).toBe(false);
  });

  it('uses a separate format for backup codes', () => {
    expect(recoverySchema.safeParse({ code: 'ABCDEF12345678' }).success).toBe(true);
    expect(recoverySchema.safeParse({ code: '123456' }).success).toBe(false);
  });
});
