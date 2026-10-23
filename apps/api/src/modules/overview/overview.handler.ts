import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { CategoryEntity } from '../categories/entities/category.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { mapTransactionRow } from '../transactions/queries/list-transactions.query';
import {
  GetOverviewSummaryQuery,
  OverviewCashflowRow,
  OverviewRecentTransactionRow,
  OverviewSummaryView,
} from './overview.queries';

@QueryHandler(GetOverviewSummaryQuery)
export class GetOverviewSummaryHandler implements IQueryHandler<GetOverviewSummaryQuery> {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accounts: Repository<AccountEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
  ) {}

  async execute(query: GetOverviewSummaryQuery): Promise<OverviewSummaryView> {
    const { from, to } = query.filters;
    const [accountsCount, totals, cashflow, recentRows] = await Promise.all([
      this.accounts.count({ where: { userId: query.userId, archivedAt: IsNull() } }),
      this.loadTotals(query.userId, from, to),
      this.loadCashflow(query.userId, from, to),
      this.loadRecentTransactions(query.userId, from, to),
    ]);

    const income = Number(totals.income);
    const expenses = Number(totals.expenses);

    return {
      period: { from, to },
      accountsCount,
      totals: { income, expenses, net: income - expenses },
      cashflow: cashflow.map((point) => ({
        period: point.period,
        income: Number(point.income),
        expenses: Number(point.expenses),
      })),
      recentTransactions: recentRows.map(mapTransactionRow),
    };
  }

  private async loadTotals(userId: string, from: string, to: string) {
    const row = await this.transactions
      .createQueryBuilder('transaction')
      .where('transaction.user_id = :userId', { userId })
      .andWhere('transaction.date BETWEEN :from AND :to', { from, to })
      .select(
        "COALESCE(SUM(CASE WHEN transaction.kind = 'income' THEN transaction.amount ELSE 0 END), 0)",
        'income',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN transaction.kind = 'expense' THEN transaction.amount ELSE 0 END), 0)",
        'expenses',
      )
      .getRawOne<{ income: string; expenses: string }>();

    return row ?? { income: '0', expenses: '0' };
  }

  private async loadCashflow(
    userId: string,
    from: string,
    to: string,
  ): Promise<OverviewCashflowRow[]> {
    return this.transactions
      .createQueryBuilder('transaction')
      .where('transaction.user_id = :userId', { userId })
      .andWhere('transaction.date BETWEEN :from AND :to', { from, to })
      .select('transaction.date', 'period')
      .addSelect(
        "COALESCE(SUM(CASE WHEN transaction.kind = 'income' THEN transaction.amount ELSE 0 END), 0)",
        'income',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN transaction.kind = 'expense' THEN transaction.amount ELSE 0 END), 0)",
        'expenses',
      )
      .groupBy('transaction.date')
      .orderBy('transaction.date', 'ASC')
      .getRawMany<OverviewCashflowRow>();
  }

  private async loadRecentTransactions(
    userId: string,
    from: string,
    to: string,
  ): Promise<OverviewRecentTransactionRow[]> {
    return this.transactions
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
      .where('transaction.user_id = :userId', { userId })
      .andWhere('transaction.date BETWEEN :from AND :to', { from, to })
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
      .addOrderBy('transaction.created_at', 'DESC')
      .limit(5)
      .getRawMany<OverviewRecentTransactionRow>();
  }
}
