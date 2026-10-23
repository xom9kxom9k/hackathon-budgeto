import { BadRequestException } from '@nestjs/common';

import { TransactionKind } from './entities/transaction.entity';
import { TransactionsController } from './transactions.controller';
import { ListTransactionsQuery } from './queries/list-transactions.query';

describe('TransactionsController', () => {
  it('sends the authenticated user and parsed filters to QueryBus', async () => {
    const execute = vi.fn().mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 25 });
    const controller = new TransactionsController({ execute } as never, { execute } as never);

    await controller.list({ userId: 'user-1' } as never, {
      page: '2',
      pageSize: '25',
      accountId: 'account-1',
      kind: TransactionKind.Expense,
      q: 'coffee',
      from: '2025-01-01',
      to: '2025-01-31',
    });

    const [query] = execute.mock.calls[0] as [ListTransactionsQuery];
    expect(query.userId).toBe('user-1');
    expect(query.filters).toEqual({
      page: 2,
      pageSize: 25,
      accountId: 'account-1',
      kind: TransactionKind.Expense,
      query: 'coffee',
      from: '2025-01-01',
      to: '2025-01-31',
    });
  });

  it('rejects invalid filters before QueryBus', async () => {
    const execute = vi.fn();
    const controller = new TransactionsController({ execute } as never, { execute } as never);

    await expect(
      controller.list({ userId: 'user-1' } as never, { pageSize: '101' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(execute).not.toHaveBeenCalled();
  });
});
