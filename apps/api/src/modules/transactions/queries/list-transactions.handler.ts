import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountEntity } from '../../accounts/entities/account.entity';
import { CategoryEntity } from '../../categories/entities/category.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import {
  ListTransactionsQuery,
  TransactionCategoryView,
  TransactionPartyView,
  TransactionView,
  TransactionsPageView,
} from './list-transactions.query';

interface TransactionRow {
  id: string;
  date: string;
  kind: TransactionView['kind'];
  amount: string;
  note: string | null;
  accountId: string;
  accountName: string;
  accountCurrency: string;
  destinationAccountId: string | null;
  destinationAccountName: string | null;
  destinationAccountCurrency: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryKind: TransactionCategoryView['kind'] | null;
}

@QueryHandler(ListTransactionsQuery)
export class ListTransactionsHandler implements IQueryHandler<ListTransactionsQuery> {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
  ) {}

  async execute(query: ListTransactionsQuery): Promise<TransactionsPageView> {
    const { filters } = query;
    const builder = this.transactions
      .createQueryBuilder('transaction')
      .leftJoin(
        AccountEntity,
        'account',
        'account.id = transaction.account_id AND account.user_id = :userId',
      )
      .leftJoin(
        AccountEntity,
        'destinationAccount',
        'destinationAccount.id = transaction.destination_account_id AND destinationAccount.user_id = :userId',
      )
      .leftJoin(
        CategoryEntity,
        'category',
        'category.id = transaction.category_id AND category.user_id = :userId',
      )
      .where('transaction.user_id = :userId', { userId: query.userId })
      .select([
        'transaction.id AS id',
        'transaction.date AS date',
        'transaction.kind AS kind',
        'transaction.amount AS amount',
        'transaction.note AS note',
        'account.id AS "accountId"',
        'account.name AS "accountName"',
        'account.currency AS "accountCurrency"',
        'destinationAccount.id AS "destinationAccountId"',
        'destinationAccount.name AS "destinationAccountName"',
        'destinationAccount.currency AS "destinationAccountCurrency"',
        'category.id AS "categoryId"',
        'category.name AS "categoryName"',
        'category.kind AS "categoryKind"',
      ])
      .orderBy('transaction.date', 'DESC')
      .addOrderBy('transaction.created_at', 'DESC');

    if (filters.accountId) {
      builder.andWhere(
        '(transaction.account_id = :accountId OR transaction.destination_account_id = :accountId)',
        { accountId: filters.accountId },
      );
    }
    if (filters.kind) builder.andWhere('transaction.kind = :kind', { kind: filters.kind });
    if (filters.query) {
      builder.andWhere('transaction.note ILIKE :query', { query: `%${filters.query}%` });
    }
    if (filters.from) builder.andWhere('transaction.date >= :from', { from: filters.from });
    if (filters.to) builder.andWhere('transaction.date <= :to', { to: filters.to });

    const total = await builder.getCount();
    const rows = (await builder
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize)
      .getRawMany()) as TransactionRow[];

    return {
      items: rows.map((row) => this.toView(row)),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  private toView(row: TransactionRow): TransactionView {
    return {
      id: row.id,
      date: row.date,
      kind: row.kind,
      amount: Number(row.amount),
      note: row.note,
      account: this.toParty(row.accountId, row.accountName, row.accountCurrency),
      destinationAccount:
        row.destinationAccountId && row.destinationAccountName && row.destinationAccountCurrency
          ? this.toParty(
              row.destinationAccountId,
              row.destinationAccountName,
              row.destinationAccountCurrency,
            )
          : null,
      category:
        row.categoryId && row.categoryName && row.categoryKind
          ? { id: row.categoryId, name: row.categoryName, kind: row.categoryKind }
          : null,
    };
  }

  private toParty(id: string, name: string, currency: string): TransactionPartyView {
    return { id, name, currency };
  }
}
