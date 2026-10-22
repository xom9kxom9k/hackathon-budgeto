import { HttpException, HttpStatus } from '@nestjs/common';

export enum AuthErrorCode {
  EmailTaken = 'AUTH_EMAIL_TAKEN',
  InvalidCredentials = 'AUTH_INVALID_CREDENTIALS',
  TotpSetupRequired = 'AUTH_TOTP_SETUP_REQUIRED',
  TotpInvalid = 'AUTH_TOTP_INVALID',
  TotpAlreadyUsed = 'AUTH_TOTP_ALREADY_USED',
  ChallengeInvalid = 'AUTH_CHALLENGE_INVALID',
  RecoveryInvalid = 'AUTH_RECOVERY_INVALID',
  RecoveryUsed = 'AUTH_RECOVERY_USED',
  SessionInvalid = 'AUTH_SESSION_INVALID',
  CsrfInvalid = 'AUTH_CSRF_INVALID',
}

export function throwAuthError(
  code: AuthErrorCode,
  status: HttpStatus = HttpStatus.UNAUTHORIZED,
): never {
  throw new HttpException({ code }, status);
}
