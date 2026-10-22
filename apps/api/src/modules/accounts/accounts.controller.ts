import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { ListAccountsQuery, AccountView } from './queries/list-accounts.query';
@Controller('accounts')
@UseGuards(AuthGuard)
export class AccountsController {
  constructor(private readonly queries: QueryBus) {}
  @Get() async list(@CurrentUser() user: AuthPrincipal): Promise<AccountView[]> {
    return this.queries.execute<ListAccountsQuery, AccountView[]>(
      new ListAccountsQuery(user.userId),
    );
  }
}
