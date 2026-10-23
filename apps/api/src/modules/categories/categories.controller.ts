import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { CategoryKind } from './entities/category.entity';
import { CategoryView, ListCategoriesQuery } from './queries/list-categories.query';

@Controller('categories')
@UseGuards(AuthGuard)
export class CategoriesController {
  constructor(private readonly queries: QueryBus) {}

  @Get()
  list(@CurrentUser() user: AuthPrincipal, @Query('kind') kind?: string): Promise<CategoryView[]> {
    if (kind && !Object.values(CategoryKind).includes(kind as CategoryKind)) {
      throw new BadRequestException('Invalid category kind');
    }

    return this.queries.execute(
      new ListCategoriesQuery(user.userId, kind as CategoryKind | undefined),
    );
  }
}
