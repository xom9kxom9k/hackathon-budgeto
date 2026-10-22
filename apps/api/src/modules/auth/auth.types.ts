import type { Request } from 'express';

export interface AuthUserView {
  id: string;
  email: string;
}

export interface AuthPrincipal {
  userId: string;
  sessionId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPrincipal;
}

export interface AuthSessionResult {
  user: AuthUserView;
  sessionToken: string;
}

export interface TotpSetupResult {
  challengeToken: string;
  otpauthUri: string;
}

export interface TotpConfirmationResult extends AuthSessionResult {
  recoveryCodes: string[];
}
