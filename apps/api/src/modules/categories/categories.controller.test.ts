import { BadRequestException } from '@nestjs/common';

import { CategoryKind } from './entities/category.entity';
import { CategoriesController } from './categories.controller';
import { ListCategoriesQuery } from './queries/list-categories.query';

describe('CategoriesController', () => {
  it('dispatches the authenticated user and category kind to QueryBus', async () => {
    const execute = vi.fn().mockResolvedValue([]);
    const controller = new CategoriesController({ execute } as never, { execute } as never);

    await controller.list({ userId: 'user-1' } as never, 'expense');

    expect(execute).toHaveBeenCalledWith(new ListCategoriesQuery('user-1', CategoryKind.Expense));
  });

  it('rejects an unknown category kind before QueryBus', async () => {
    const execute = vi.fn();
    const controller = new CategoriesController({ execute } as never, { execute } as never);

    expect(() => controller.list({ userId: 'user-1' } as never, 'transfer')).toThrow(
      BadRequestException,
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('dispatches mutations through CommandBus', async () => {
    const execute = vi.fn().mockResolvedValue({});
    const controller = new CategoriesController(
      { execute: vi.fn() } as never,
      { execute } as never,
    );

    await controller.create({ userId: 'user-1' } as never, {
      name: ' Food ',
      kind: CategoryKind.Expense,
    });
    await controller.update({ userId: 'user-1' } as never, 'category-1', { name: 'Groceries' });
    await controller.archive({ userId: 'user-1' } as never, 'category-1');

    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ userId: 'user-1', name: ' Food ' }),
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ userId: 'user-1', id: 'category-1' }),
    );
    expect(execute).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ userId: 'user-1', id: 'category-1' }),
    );
  });
});
