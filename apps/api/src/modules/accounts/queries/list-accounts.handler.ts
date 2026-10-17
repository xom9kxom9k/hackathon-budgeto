import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AccountView, ListAccountsQuery } from './list-accounts.query';
@QueryHandler(ListAccountsQuery)
export class ListAccountsHandler implements IQueryHandler<ListAccountsQuery> {
  async execute(_query: ListAccountsQuery): Promise<AccountView[]> { return []; } // Placeholder. No fake account records.
}
