import { randomBytes } from 'node:crypto';
import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';

import { CsrfGuard } from './csrf.guard';
import {
  CompleteTotpLoginCommand,
  CompleteTotpSetupCommand,
  LoginWithPasswordCommand,
  LogoutCommand,
  RegisterUserCommand,
  UseRecoveryCodeCommand,
} from './auth.commands';
import { GetCurrentUserQuery } from './auth.queries';
import { LoginDto, RecoveryChallengeDto, RegisterDto, TotpChallengeDto } from './auth.dto';
import { AuthGuard } from './auth.guard';
import { csrfCookieName, AuthSessionService, sessionCookieName } from './auth.session';
import type { AuthenticatedRequest } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    private readonly sessions: AuthSessionService,
  ) {}

  @Get('csrf')
  getCsrf(@Res({ passthrough: true }) response: Response): { token: string } {
    const token = randomBytes(32).toString('base64url');
    response.cookie(csrfCookieName, token, {
      httpOnly: false,
      maxAge: 60 * 60 * 1000,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return { token };
  }

  @Post('register')
  @UseGuards(CsrfGuard)
  async register(@Body() body: RegisterDto) {
    return this.commands.execute(new RegisterUserCommand(body.email, body.password));
  }

  @Post('register/totp')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(CsrfGuard)
  async completeRegistration(
    @Body() body: TotpChallengeDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.commands.execute(
      new CompleteTotpSetupCommand(body.challengeToken, body.code),
    );
    this.sessions.setSessionCookie(response, result.sessionToken);
    return { user: result.user, recoveryCodes: result.recoveryCodes };
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(CsrfGuard)
  async login(@Body() body: LoginDto) {
    return this.commands.execute(new LoginWithPasswordCommand(body.email, body.password));
  }

  @Post('login/totp')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(CsrfGuard)
  async completeLogin(
    @Body() body: TotpChallengeDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.commands.execute(
      new CompleteTotpLoginCommand(body.challengeToken, body.code),
    );
    this.sessions.setSessionCookie(response, result.sessionToken);
    return { user: result.user };
  }

  @Post('login/recovery')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(CsrfGuard)
  async recovery(
    @Body() body: RecoveryChallengeDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.commands.execute(
      new UseRecoveryCodeCommand(body.challengeToken, body.code),
    );
    this.sessions.setSessionCookie(response, result.sessionToken);
    return { user: result.user };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() request: AuthenticatedRequest) {
    const user = await this.queries.execute(new GetCurrentUserQuery(request.user!.userId));
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(CsrfGuard)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.commands.execute(new LogoutCommand(request.cookies?.[sessionCookieName]));
    this.sessions.clearSessionCookie(response);
  }
}
