import { CategoryKind } from '../entities/category.entity';
import { ListCategoriesHandler } from './list-categories.handler';
import { ListCategoriesQuery } from './list-categories.query';

describe('ListCategoriesHandler', () => {
  it('limits the query to the owner and maps category views', async () => {
    const find = vi
      .fn()
      .mockResolvedValue([
        { id: 'category-1', userId: 'user-1', name: 'Food', kind: CategoryKind.Expense },
      ]);
    const handler = new ListCategoriesHandler({ find } as never);

    const result = await handler.execute(new ListCategoriesQuery('user-1'));

    expect(find).toHaveBeenCalledWith({
      where: { userId: 'user-1', archivedAt: null },
      order: { kind: 'ASC', name: 'ASC' },
    });
    expect(result).toEqual([{ id: 'category-1', name: 'Food', kind: CategoryKind.Expense }]);
  });
});
