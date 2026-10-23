import { BadRequestException } from '@nestjs/common';

import { CategoryKind } from './entities/category.entity';
import { CategoriesController } from './categories.controller';
import { ListCategoriesQuery } from './queries/list-categories.query';

describe('CategoriesController', () => {
  it('dispatches the authenticated user and category kind to QueryBus', async () => {
    const execute = vi.fn().mockResolvedValue([]);
    const controller = new CategoriesController({ execute } as never);

    await controller.list({ userId: 'user-1' } as never, 'expense');

    expect(execute).toHaveBeenCalledWith(new ListCategoriesQuery('user-1', CategoryKind.Expense));
  });

  it('rejects an unknown category kind before QueryBus', async () => {
    const execute = vi.fn();
    const controller = new CategoriesController({ execute } as never);

    expect(() => controller.list({ userId: 'user-1' } as never, 'transfer')).toThrow(
      BadRequestException,
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
