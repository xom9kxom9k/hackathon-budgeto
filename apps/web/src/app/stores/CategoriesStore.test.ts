import type { CategoriesService } from '@/shared/services/CategoriesService';
import { CategoriesStore } from './CategoriesStore';

describe('CategoriesStore', () => {
  it('loads categories once and filters them by kind', async () => {
    const list = vi.fn().mockResolvedValue([
      { id: 'income-1', name: 'Salary', kind: 'income' },
      { id: 'expense-1', name: 'Food', kind: 'expense' },
    ]);
    const store = new CategoriesStore({ list } as unknown as CategoriesService);

    await Promise.all([store.load(), store.load()]);

    expect(list).toHaveBeenCalledOnce();
    expect(store.status).toBe('success');
    expect(store.byKind('expense')).toEqual([{ id: 'expense-1', name: 'Food', kind: 'expense' }]);
  });

  it('supports retry after an API error', async () => {
    const list = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([]);
    const store = new CategoriesStore({ list } as unknown as CategoriesService);

    await store.load();
    expect(store.status).toBe('error');

    await store.retry();

    expect(store.status).toBe('empty');
    expect(list).toHaveBeenCalledTimes(2);
  });
});
