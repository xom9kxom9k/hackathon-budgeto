import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.types';
import { AuthErrorCode, throwAuthError } from './auth.error-code';

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.user) throwAuthError(AuthErrorCode.SessionInvalid);
  return request.user;
});
