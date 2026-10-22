import type { TFunction } from 'i18next';

import { I18nKey } from '@/shared/i18n';

import { ApiError } from './errors';

const authErrorKeys: Record<string, I18nKey> = {
  AUTH_EMAIL_TAKEN: I18nKey.AuthErrorEmailTaken,
  AUTH_INVALID_CREDENTIALS: I18nKey.AuthErrorInvalidCredentials,
  AUTH_TOTP_SETUP_REQUIRED: I18nKey.AuthErrorTotpSetupRequired,
  AUTH_TOTP_INVALID: I18nKey.AuthErrorTotpInvalid,
  AUTH_TOTP_ALREADY_USED: I18nKey.AuthErrorTotpAlreadyUsed,
  AUTH_CHALLENGE_INVALID: I18nKey.AuthErrorChallengeInvalid,
  AUTH_RECOVERY_INVALID: I18nKey.AuthErrorRecoveryInvalid,
  AUTH_RECOVERY_USED: I18nKey.AuthErrorRecoveryUsed,
  AUTH_SESSION_INVALID: I18nKey.AuthErrorSessionInvalid,
  AUTH_CSRF_INVALID: I18nKey.AuthErrorCsrfInvalid,
};

export function getAuthErrorKey(error: unknown): I18nKey {
  if (!(error instanceof ApiError) || !error.code) return I18nKey.AuthGenericError;
  return authErrorKeys[error.code] ?? I18nKey.AuthGenericError;
}

export function translateAuthError(error: unknown, t: TFunction): string {
  return t(getAuthErrorKey(error));
}
