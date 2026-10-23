import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountEntity } from '../entities/account.entity';

import { AccountView, ListAccountsQuery } from './list-accounts.query';

@QueryHandler(ListAccountsQuery)
export class ListAccountsHandler implements IQueryHandler<ListAccountsQuery> {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accounts: Repository<AccountEntity>,
  ) {}

  async execute(query: ListAccountsQuery): Promise<AccountView[]> {
    const accounts = await this.accounts.find({
      where: { userId: query.userId, archivedAt: null },
      order: { createdAt: 'ASC' },
    });

    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
    }));
  }
}
