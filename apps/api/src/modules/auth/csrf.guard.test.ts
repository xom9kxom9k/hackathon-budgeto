import { HttpException } from '@nestjs/common';

import { csrfCookieName } from './auth.session';
import { CsrfGuard } from './csrf.guard';

function contextFor(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  it('allows safe methods and the token endpoint', () => {
    expect(guard.canActivate(contextFor({ method: 'GET', path: '/api/accounts' }))).toBe(true);
    expect(guard.canActivate(contextFor({ method: 'OPTIONS', path: '/api/accounts' }))).toBe(true);
    expect(guard.canActivate(contextFor({ method: 'POST', path: '/api/auth/csrf' }))).toBe(true);
  });

  it('requires a matching cookie and header for mutations', () => {
    expect(() =>
      guard.canActivate(
        contextFor({ method: 'POST', path: '/api/accounts', headers: {}, cookies: {} }),
      ),
    ).toThrow(HttpException);
    expect(() =>
      guard.canActivate(
        contextFor({
          method: 'PATCH',
          path: '/api/profile',
          cookies: { [csrfCookieName]: 'token' },
          headers: { 'x-csrf-token': 'wrong' },
        }),
      ),
    ).toThrow(HttpException);
  });

  it('accepts a matching token pair', () => {
    expect(
      guard.canActivate(
        contextFor({
          method: 'DELETE',
          originalUrl: '/api/accounts/account-1?confirm=true',
          cookies: { [csrfCookieName]: 'token' },
          headers: { 'x-csrf-token': 'token' },
        }),
      ),
    ).toBe(true);
  });
});
