import { CategoryKind } from './entities/category.entity';
import { CategoryView } from './queries/list-categories.query';

export class CreateCategoryCommand {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly kind: CategoryKind,
  ) {}
}

export class UpdateCategoryCommand {
  constructor(
    public readonly userId: string,
    public readonly id: string,
    public readonly name: string,
  ) {}
}

export class ArchiveCategoryCommand {
  constructor(
    public readonly userId: string,
    public readonly id: string,
  ) {}
}

export type CategoryMutationResult = CategoryView & { archivedAt: string | null };
