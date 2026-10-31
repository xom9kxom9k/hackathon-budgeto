import type { Response } from 'express';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { SessionEntity } from './entities/session.entity';

import { AuthCryptoService } from './auth.crypto';

export const sessionCookieName = 'budgetto_session';
export const csrfCookieName = 'budgetto_csrf';

@Injectable()
export class AuthSessionService {
  private readonly ttlMs: number;
  private readonly secureCookies: boolean;

  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessions: Repository<SessionEntity>,
    private readonly crypto: AuthCryptoService,
    config: ConfigService,
  ) {
    const ttlDays = Number(config.get<string>('SESSION_TTL_DAYS') ?? 7);
    this.ttlMs = Math.max(1, ttlDays) * 24 * 60 * 60 * 1000;
    this.secureCookies = config.get<string>('NODE_ENV') === 'production';
  }

  async createSession(userId: string): Promise<{ token: string; session: SessionEntity }> {
    const token = this.crypto.randomToken();
    const now = new Date();
    const session = this.sessions.create({
      userId,
      tokenHash: this.crypto.hashToken(token),
      expiresAt: new Date(now.getTime() + this.ttlMs),
      lastSeenAt: now,
      revokedAt: null,
    });

    return { token, session: await this.sessions.save(session) };
  }

  setSessionCookie(response: Response, token: string): void {
    response.cookie(sessionCookieName, token, {
      httpOnly: true,
      maxAge: this.ttlMs,
      path: '/',
      sameSite: 'lax',
      secure: this.secureCookies,
    });
  }

  clearSessionCookie(response: Response): void {
    response.clearCookie(sessionCookieName, { path: '/' });
  }

  async revoke(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.sessions.update(
      { tokenHash: this.crypto.hashToken(token), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
