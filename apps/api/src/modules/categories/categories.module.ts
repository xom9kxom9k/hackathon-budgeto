import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CategoriesController } from './categories.controller';
import { CategoryEntity } from './entities/category.entity';
import { ListCategoriesHandler } from './queries/list-categories.handler';
import { ArchiveCategoryHandler, CreateCategoryHandler, UpdateCategoryHandler } from './commands/category.handlers';

@Module({
  imports: [CqrsModule, AuthModule, TypeOrmModule.forFeature([CategoryEntity])],
  controllers: [CategoriesController],
  providers: [ListCategoriesHandler, CreateCategoryHandler, UpdateCategoryHandler, ArchiveCategoryHandler],
  exports: [TypeOrmModule],
})
export class CategoriesModule {}
