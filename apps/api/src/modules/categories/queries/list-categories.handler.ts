import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { CategoryEntity } from '../entities/category.entity';
import { CategoryView, ListCategoriesQuery } from './list-categories.query';

@QueryHandler(ListCategoriesQuery)
export class ListCategoriesHandler implements IQueryHandler<ListCategoriesQuery> {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
  ) {}

  async execute(query: ListCategoriesQuery): Promise<CategoryView[]> {
    const categories = await this.categories.find({
      where: query.kind
        ? { userId: query.userId, kind: query.kind, archivedAt: IsNull() }
        : { userId: query.userId, archivedAt: IsNull() },
      order: { kind: 'ASC', name: 'ASC' },
    });

    return categories.map(({ id, name, kind }) => ({ id, name, kind }));
  }
}
