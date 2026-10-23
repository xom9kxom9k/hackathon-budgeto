import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { CategoryKind } from './entities/category.entity';
import { CategoryView, ListCategoriesQuery } from './queries/list-categories.query';
import {
  ArchiveCategoryCommand,
  CreateCategoryCommand,
  UpdateCategoryCommand,
} from './categories.commands';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

@Controller('categories')
@UseGuards(AuthGuard)
export class CategoriesController {
  constructor(
    private readonly queries: QueryBus,
    private readonly commands: CommandBus,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthPrincipal, @Query('kind') kind?: string): Promise<CategoryView[]> {
    if (kind && !Object.values(CategoryKind).includes(kind as CategoryKind)) {
      throw new BadRequestException('Invalid category kind');
    }

    return this.queries.execute(
      new ListCategoriesQuery(user.userId, kind as CategoryKind | undefined),
    );
  }

  @Post()
  create(@CurrentUser() user: AuthPrincipal, @Body() body: CreateCategoryDto) {
    return this.commands.execute(new CreateCategoryCommand(user.userId, body.name, body.kind));
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.commands.execute(new UpdateCategoryCommand(user.userId, id, body.name));
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.commands.execute(new ArchiveCategoryCommand(user.userId, id));
  }
}
