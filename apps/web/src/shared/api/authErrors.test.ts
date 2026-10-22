import { I18nKey } from '@/shared/i18n';

import { getAuthErrorKey } from './authErrors';
import { ApiError } from './errors';

describe('auth API errors', () => {
  it('maps stable backend codes to translation keys', () => {
    expect(getAuthErrorKey(new ApiError('ignored', 409, { code: 'AUTH_EMAIL_TAKEN' }))).toBe(
      I18nKey.AuthErrorEmailTaken,
    );
  });

  it('does not expose unknown backend text', () => {
    expect(getAuthErrorKey(new ApiError('internal database detail', 500, {}))).toBe(
      I18nKey.AuthGenericError,
    );
  });
});
