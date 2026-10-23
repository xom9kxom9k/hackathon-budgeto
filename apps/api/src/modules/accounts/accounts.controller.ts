import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { ListAccountsQuery, AccountView } from './queries/list-accounts.query';
import {
  ArchiveAccountCommand,
  CreateAccountCommand,
  UpdateAccountCommand,
} from './accounts.commands';
import { CreateAccountDto, UpdateAccountDto } from './accounts.dto';
@Controller('accounts')
@UseGuards(AuthGuard)
export class AccountsController {
  constructor(
    private readonly queries: QueryBus,
    private readonly commands: CommandBus,
  ) {}
  @Get() async list(@CurrentUser() user: AuthPrincipal): Promise<AccountView[]> {
    return this.queries.execute<ListAccountsQuery, AccountView[]>(
      new ListAccountsQuery(user.userId),
    );
  }

  @Post()
  create(@CurrentUser() user: AuthPrincipal, @Body() body: CreateAccountDto) {
    return this.commands.execute(new CreateAccountCommand(user.userId, body.name, body.currency));
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() body: UpdateAccountDto,
  ) {
    return this.commands.execute(new UpdateAccountCommand(user.userId, id, body.name));
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.commands.execute(new ArchiveAccountCommand(user.userId, id));
  }
}
