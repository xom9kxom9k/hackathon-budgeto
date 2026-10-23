import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { CategoryKind } from './entities/category.entity';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsIn(Object.values(CategoryKind))
  kind!: CategoryKind;
}

export class UpdateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;
}
