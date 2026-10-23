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
    groupBy: vi.fn().mockReturnThis(),
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
    const builders = [totalsBuilder, cashflowBuilder, recentBuilder];
    const createQueryBuilder = vi.fn(() => builders.shift());
    const accounts = {
      count: vi.fn().mockResolvedValue(1),
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
      totals: { income: 1000, expenses: 250, net: 750 },
      cashflow: [{ period: '2025-01-10', income: 1000, expenses: 250 }],
    });
    expect(result.recentTransactions[0].amount).toBe(1000);
  });
});
