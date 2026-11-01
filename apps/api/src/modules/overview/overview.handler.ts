import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
    const accounts = await this.accounts.find({
      where: { userId: query.userId },
      select: { currency: true, archivedAt: true },
    });
    const availableCurrencies = [...new Set(accounts.map((account) => account.currency))].sort();
    const currency =
      query.filters.currency ??
      (availableCurrencies.includes('RUB') ? 'RUB' : (availableCurrencies[0] ?? 'RUB'));
    const [totals, cashflow, categories, incomeCategories, recentRows] = await Promise.all([
      this.loadTotals(query.userId, from, to, currency),
      this.loadCashflow(query.userId, from, to, currency),
      this.loadCategories(query.userId, from, to, currency, 'expense'),
      this.loadCategories(query.userId, from, to, currency, 'income'),
      this.loadRecentTransactions(query.userId, from, to, currency),
    ]);

    const income = Number(totals.income);
    const expenses = Number(totals.expenses);

    return {
      period: { from, to },
      currency,
      availableCurrencies,
      accountsCount: accounts.filter(
        (account) => account.currency === currency && !account.archivedAt,
      ).length,
      expenseCategories: categories.map((category) => ({
        ...category,
        amount: Number(category.amount),
        count: Number(category.count),
      })),
      incomeCategories: incomeCategories.map((category) => ({
        ...category,
        amount: Number(category.amount),
        count: Number(category.count),
      })),
      totals: { income, expenses, net: income - expenses },
      cashflow: cashflow.map((point) => ({
        period: point.period,
        income: Number(point.income),
        expenses: Number(point.expenses),
      })),
      recentTransactions: recentRows.map(mapTransactionRow),
    };
  }

  private movementQuery(userId: string, from: string, to: string, currency: string) {
    return this.transactions
      .createQueryBuilder('transaction')
      .innerJoin(
        AccountEntity,
        'account',
        'account.id = transaction.account_id AND account.user_id = :userId',
      )
      .where('transaction.user_id = :userId', { userId })
      .andWhere('transaction.date BETWEEN :from AND :to', { from, to })
      .andWhere('transaction.reversed_at IS NULL')
      .andWhere('account.currency = :currency', { currency });
  }

  private async loadCategories(
    userId: string,
    from: string,
    to: string,
    currency: string,
    kind: 'income' | 'expense',
  ) {
    return this.movementQuery(userId, from, to, currency)
      .leftJoin(
        CategoryEntity,
        'category',
        'category.id = transaction.category_id AND category.user_id = :userId',
      )
      .andWhere('transaction.kind = :kind', { kind })
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      .addSelect('SUM(transaction.amount)', 'amount')
      .addSelect('COUNT(*)', 'count')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('SUM(transaction.amount)', 'DESC')
      .getRawMany<{ id: string | null; name: string | null; amount: string; count: string }>();
  }

  private async loadTotals(userId: string, from: string, to: string, currency: string) {
    const row = await this.movementQuery(userId, from, to, currency)
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
    currency: string,
  ): Promise<OverviewCashflowRow[]> {
    return this.movementQuery(userId, from, to, currency)
      .select("TO_CHAR(transaction.date, 'YYYY-MM-DD')", 'period')
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
    currency: string,
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
      .andWhere('transaction.reversed_at IS NULL')
      .andWhere('account.currency = :currency', { currency })
      .select([
        'transaction.id AS id',
        "TO_CHAR(transaction.date, 'YYYY-MM-DD') AS date",
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
