import type { Transaction } from '@/entities/transaction/model/types';
import type { TransactionsService } from '@/shared/services/TransactionsService';
import { TransactionsStore } from './TransactionsStore';

const transaction: Transaction = {
  id: 'transaction-1',
  date: '2025-01-20',
  kind: 'expense',
  amount: 125.5,
  note: null,
  account: { id: 'account-1', name: 'Основной счёт', currency: 'RUB' },
  destinationAccount: null,
  category: null,
};

describe('TransactionsStore', () => {
  it('loads a page once and keeps empty state explicit', async () => {
    const list = vi.fn().mockResolvedValue({
      items: [transaction],
      total: 1,
      page: 1,
      pageSize: 50,
    });
    const store = new TransactionsStore({
      list,
    } as unknown as TransactionsService);

    await Promise.all([store.load(), store.load()]);

    expect(list).toHaveBeenCalledOnce();
    expect(store.status).toBe('success');
    expect(store.items).toEqual([transaction]);
  });

  it('retries failed requests with the current filters', async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 50 });
    const store = new TransactionsStore({
      list,
    } as unknown as TransactionsService);

    await store.load({ page: 1, pageSize: 50, kind: 'income' });
    expect(store.status).toBe('error');
    await store.retry();

    expect(store.status).toBe('empty');
    expect(list).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 50,
      kind: 'income',
    });
  });
});
