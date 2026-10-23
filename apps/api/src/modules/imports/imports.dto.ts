import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { ImportIssueCode, ImportTransactionType } from '../../shared/import-parser/types';

export class ImportRowDto {
  @IsInt()
  @Min(1)
  sourceRow!: number;

  @IsOptional()
  @IsDateString()
  date!: string | null;

  @IsOptional()
  @IsIn(['income', 'expense', 'transfer'])
  type!: ImportTransactionType | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  accountName!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  destinationAccountName!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  categoryName!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note!: string | null;

  @IsBoolean()
  valid!: boolean;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  errors!: ImportIssueCode[];

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  warnings!: ImportIssueCode[];
}

export class UpdateImportRowsDto {
  @IsArray()
  @ArrayMaxSize(10_000)
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  rows!: ImportRowDto[];
}
