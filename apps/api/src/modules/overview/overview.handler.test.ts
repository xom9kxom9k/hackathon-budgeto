import type { Repository } from 'typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { TransactionEntity, TransactionKind } from '../transactions/entities/transaction.entity';
import { GetOverviewSummaryHandler } from './overview.handler';
import { GetOverviewSummaryQuery } from './overview.queries';

function makeBuilder(result: unknown) {
  return {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    addGroupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    getRawOne: vi.fn().mockResolvedValue(result),
    getRawMany: vi.fn().mockResolvedValue(result),
  };
}

describe('GetOverviewSummaryHandler', () => {
  it('aggregates owned money movement and excludes transfers', async () => {
    const totalsBuilder = makeBuilder({ income: '1000', expenses: '250' });
    const cashflowBuilder = makeBuilder([
      { period: '2025-01-10', income: '1000', expenses: '250' },
    ]);
    const recentBuilder = makeBuilder([
      {
        id: 'transaction-1',
        date: '2025-01-10',
        kind: TransactionKind.Income,
        amount: '1000',
        note: 'Salary',
        accountId: 'account-1',
        accountName: 'Main',
        accountCurrency: 'RUB',
        destinationAccountId: null,
        destinationAccountName: null,
        destinationAccountCurrency: null,
        categoryId: null,
        categoryName: null,
        categoryKind: null,
      },
    ]);
    const expenseBuilder = makeBuilder([{ id: 'rent', name: 'Rent', amount: '250', count: '2' }]);
    const incomeBuilder = makeBuilder([{ id: null, name: null, amount: '1000', count: '1' }]);
    const builders = [totalsBuilder, cashflowBuilder, expenseBuilder, incomeBuilder, recentBuilder];
    const createQueryBuilder = vi.fn(() => builders.shift());
    const accounts = {
      find: vi.fn().mockResolvedValue([
        { currency: 'RUB', archivedAt: null },
        { currency: 'USD', archivedAt: null },
        { currency: 'RUB', archivedAt: new Date() },
      ]),
    } as unknown as Repository<AccountEntity>;
    const transactions = { createQueryBuilder } as unknown as Repository<TransactionEntity>;
    const handler = new GetOverviewSummaryHandler(accounts, transactions);

    const result = await handler.execute(
      new GetOverviewSummaryQuery('user-1', { from: '2025-01-01', to: '2025-01-31' }),
    );

    expect(totalsBuilder.where).toHaveBeenCalledWith('transaction.user_id = :userId', {
      userId: 'user-1',
    });
    expect(result).toMatchObject({
      period: { from: '2025-01-01', to: '2025-01-31' },
      accountsCount: 1,
      currency: 'RUB',
      availableCurrencies: ['RUB', 'USD'],
      expenseCategories: [{ id: 'rent', name: 'Rent', amount: 250, count: 2 }],
      incomeCategories: [{ id: null, name: null, amount: 1000, count: 1 }],
      totals: { income: 1000, expenses: 250, net: 750 },
      cashflow: [{ period: '2025-01-10', income: 1000, expenses: 250 }],
    });
    expect(result.recentTransactions[0].amount).toBe(1000);
    expect(cashflowBuilder.select).toHaveBeenCalledWith(
      "TO_CHAR(transaction.date, 'YYYY-MM-DD')",
      'period',
    );
    expect(recentBuilder.select).toHaveBeenCalledWith(
      expect.arrayContaining(["TO_CHAR(transaction.date, 'YYYY-MM-DD') AS date"]),
    );
    for (const builder of [
      totalsBuilder,
      cashflowBuilder,
      expenseBuilder,
      incomeBuilder,
      recentBuilder,
    ]) {
      expect(builder.andWhere).toHaveBeenCalledWith('transaction.reversed_at IS NULL');
      expect(builder.andWhere).toHaveBeenCalledWith('account.currency = :currency', {
        currency: 'RUB',
      });
    }
    expect(expenseBuilder.andWhere).toHaveBeenCalledWith('transaction.kind = :kind', {
      kind: 'expense',
    });
    expect(incomeBuilder.andWhere).toHaveBeenCalledWith('transaction.kind = :kind', {
      kind: 'income',
    });
  });
});
