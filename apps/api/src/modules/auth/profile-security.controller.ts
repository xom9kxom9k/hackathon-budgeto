import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from './auth.guard';
import { CsrfGuard } from './csrf.guard';
import type { AuthenticatedRequest } from './auth.types';
import { GetProfileQuery, GetSecurityStatusQuery, ListSecuritySessionsQuery, RevokeAllSecuritySessionsCommand, RevokeSecuritySessionCommand, UpdateProfileCommand, UpdateProfilePreferencesCommand } from './profile.security';

@Controller()
export class ProfileSecurityController {
  constructor(private readonly commands: CommandBus, private readonly queries: QueryBus) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  profile(@Req() request: AuthenticatedRequest) { return this.queries.execute(new GetProfileQuery(request.user!.userId)); }

  @Patch('profile')
  @UseGuards(AuthGuard, CsrfGuard)
  updateProfile(@Req() request: AuthenticatedRequest, @Body('displayName') displayName: string, @Body('goals') goals: string[]) {
    return this.commands.execute(new UpdateProfileCommand(request.user!.userId, displayName, goals ?? []));
  }

  @Patch('profile/preferences')
  @UseGuards(AuthGuard, CsrfGuard)
  updatePreferences(@Req() request: AuthenticatedRequest, @Body('locale') locale?: string, @Body('timezone') timezone?: string) {
    return this.commands.execute(new UpdateProfilePreferencesCommand(request.user!.userId, locale, timezone));
  }

  @Get('security/sessions')
  @UseGuards(AuthGuard)
  sessions(@Req() request: AuthenticatedRequest) { return this.queries.execute(new ListSecuritySessionsQuery(request.user!.userId)); }

  @Post('security/sessions/:id/revoke')
  @UseGuards(AuthGuard, CsrfGuard)
  revokeSession(@Req() request: AuthenticatedRequest, @Param('id') id: string) { return this.commands.execute(new RevokeSecuritySessionCommand(request.user!.userId, id)); }

  @Post('security/sessions/revoke-all')
  @UseGuards(AuthGuard, CsrfGuard)
  revokeAll(@Req() request: AuthenticatedRequest) { return this.commands.execute(new RevokeAllSecuritySessionsCommand(request.user!.userId, request.user!.sessionId)); }

  @Get('security/status')
  @UseGuards(AuthGuard)
  securityStatus(@Req() request: AuthenticatedRequest) { return this.queries.execute(new GetSecurityStatusQuery(request.user!.userId)); }
}
