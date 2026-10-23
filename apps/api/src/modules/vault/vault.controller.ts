import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { RegisterVaultKeyCommand } from './vault.commands';
import { RegisterVaultKeyDto } from './vault.dto';
import {
  GetVaultEventQuery,
  GetVaultKeyQuery,
  ListVaultEventsQuery,
  VerifyVaultIntegrityQuery,
} from './vault.queries';

@Controller('vault')
@UseGuards(AuthGuard)
export class VaultController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get('key')
  key(@CurrentUser() user: AuthPrincipal) {
    return this.queries.execute(new GetVaultKeyQuery(user.userId));
  }

  @Post('key/public')
  registerKey(@CurrentUser() user: AuthPrincipal, @Body() body: RegisterVaultKeyDto) {
    return this.commands.execute(
      new RegisterVaultKeyCommand(
        user.userId,
        body.publicKey,
        body.encryptedPrivateKey,
        body.keyVersion,
      ),
    );
  }

  @Get('events')
  events(@CurrentUser() user: AuthPrincipal) {
    return this.queries.execute(new ListVaultEventsQuery(user.userId));
  }

  @Get('events/:id')
  event(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.queries.execute(new GetVaultEventQuery(user.userId, id));
  }

  @Get('integrity')
  integrity(@CurrentUser() user: AuthPrincipal) {
    return this.queries.execute(new VerifyVaultIntegrityQuery(user.userId));
  }
}
