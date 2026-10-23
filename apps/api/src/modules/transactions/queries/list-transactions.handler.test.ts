import type { Repository } from 'typeorm';

import { TransactionEntity, TransactionKind } from '../entities/transaction.entity';
import { ListTransactionsHandler } from './list-transactions.handler';
import { ListTransactionsQuery } from './list-transactions.query';

describe('ListTransactionsHandler', () => {
  it('limits the query to the owner and maps nullable relations', async () => {
    const where = vi.fn().mockReturnThis();
    const builder = {
      leftJoin: vi.fn().mockReturnThis(),
      where,
      select: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getCount: vi.fn().mockResolvedValue(1),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([
        {
          id: 'transaction-1',
          date: '2025-01-20',
          kind: TransactionKind.Expense,
          amount: '125.50',
          note: null,
          accountId: 'account-1',
          accountName: 'Основной счёт',
          accountCurrency: 'RUB',
          destinationAccountId: null,
          destinationAccountName: null,
          destinationAccountCurrency: null,
          categoryId: null,
          categoryName: null,
          categoryKind: null,
        },
      ]),
    };
    const repository = {
      createQueryBuilder: vi.fn().mockReturnValue(builder),
    } as unknown as Repository<TransactionEntity>;
    const handler = new ListTransactionsHandler(repository);

    const result = await handler.execute(
      new ListTransactionsQuery('user-1', { page: 1, pageSize: 50 }),
    );

    expect(where).toHaveBeenCalledWith('transaction.user_id = :userId', { userId: 'user-1' });
    expect(result).toEqual({
      items: [
        {
          id: 'transaction-1',
          date: '2025-01-20',
          kind: TransactionKind.Expense,
          amount: 125.5,
          note: null,
          account: { id: 'account-1', name: 'Основной счёт', currency: 'RUB' },
          destinationAccount: null,
          category: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    });
  });
});
