import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ListAccountsQuery, AccountView } from './queries/list-accounts.query';
@Controller('accounts')
export class AccountsController {
  constructor(private readonly queries: QueryBus) {}
  @Get() async list(): Promise<AccountView[]> { return this.queries.execute<ListAccountsQuery, AccountView[]>(new ListAccountsQuery()); }
}
