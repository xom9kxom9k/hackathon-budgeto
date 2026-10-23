import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth.types';
import {
  GetProfileQuery,
  GetSecurityStatusQuery,
  ListSecuritySessionsQuery,
  RevokeAllSecuritySessionsCommand,
  RevokeSecuritySessionCommand,
  UpdateProfileCommand,
  UpdateProfilePreferencesCommand,
} from './profile.security';
import { UpdateProfileDto, UpdateProfilePreferencesDto } from './profile-security.dto';

@Controller()
export class ProfileSecurityController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  profile(@Req() request: AuthenticatedRequest) {
    return this.queries.execute(new GetProfileQuery(request.user!.userId));
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  updateProfile(@Req() request: AuthenticatedRequest, @Body() body: UpdateProfileDto) {
    return this.commands.execute(
      new UpdateProfileCommand(request.user!.userId, body.displayName, body.goals),
    );
  }

  @Patch('profile/preferences')
  @UseGuards(AuthGuard)
  updatePreferences(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateProfilePreferencesDto,
  ) {
    return this.commands.execute(
      new UpdateProfilePreferencesCommand(request.user!.userId, body.locale, body.timezone),
    );
  }

  @Get('security/sessions')
  @UseGuards(AuthGuard)
  sessions(@Req() request: AuthenticatedRequest) {
    return this.queries.execute(new ListSecuritySessionsQuery(request.user!.userId));
  }

  @Post('security/sessions/:id/revoke')
  @UseGuards(AuthGuard)
  revokeSession(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.commands.execute(new RevokeSecuritySessionCommand(request.user!.userId, id));
  }

  @Post('security/sessions/revoke-all')
  @UseGuards(AuthGuard)
  revokeAll(@Req() request: AuthenticatedRequest) {
    return this.commands.execute(
      new RevokeAllSecuritySessionsCommand(request.user!.userId, request.user!.sessionId),
    );
  }

  @Get('security/status')
  @UseGuards(AuthGuard)
  securityStatus(@Req() request: AuthenticatedRequest) {
    return this.queries.execute(new GetSecurityStatusQuery(request.user!.userId));
  }
}
