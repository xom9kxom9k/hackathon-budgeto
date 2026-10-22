import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { GetSessionUserQuery } from './auth.queries';
import { sessionCookieName } from './auth.session';
import type { AuthenticatedRequest } from './auth.types';
import { AuthErrorCode, throwAuthError } from './auth.error-code';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly queries: QueryBus) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionToken = request.cookies?.[sessionCookieName];

    if (!sessionToken) throwAuthError(AuthErrorCode.SessionInvalid);

    const principal = await this.queries.execute(new GetSessionUserQuery(sessionToken));
    if (!principal) throwAuthError(AuthErrorCode.SessionInvalid);

    request.user = principal;
    return true;
  }
}
