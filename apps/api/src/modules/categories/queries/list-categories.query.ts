import { CategoryKind } from '../entities/category.entity';

export interface CategoryView {
  id: string;
  name: string;
  kind: CategoryKind;
}

export class ListCategoriesQuery {
  constructor(
    public readonly userId: string,
    public readonly kind?: CategoryKind,
  ) {}
}
