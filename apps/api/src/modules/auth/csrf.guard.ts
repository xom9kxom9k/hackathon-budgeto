import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';

import { csrfCookieName } from './auth.session';
import { AuthErrorCode, throwAuthError } from './auth.error-code';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      method: string;
      path?: string;
      originalUrl?: string;
      cookies?: Record<string, string>;
      headers: Record<string, string | string[] | undefined>;
    }>();

    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) return true;

    const requestPath = request.path ?? request.originalUrl?.split('?')[0] ?? '';
    if (requestPath.endsWith('/auth/csrf')) return true;

    const cookieToken = request.cookies?.[csrfCookieName];
    const headerValue = request.headers['x-csrf-token'];
    const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throwAuthError(AuthErrorCode.CsrfInvalid, HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
