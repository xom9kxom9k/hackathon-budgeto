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
import type {
  ImportIssueCode,
  ImportSourceKind,
  ImportTransactionType,
} from '../../shared/import-parser/types';

export class ImportSourceRefDto {
  @IsIn(['xlsx', 'csv', 'pdf'])
  kind!: ImportSourceKind;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  sheet?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  record?: number;
}

export class ImportRowDto {
  @IsInt()
  @Min(1)
  sourceRow!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ImportSourceRefDto)
  sourceRef?: ImportSourceRefDto;

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

  @IsOptional()
  @IsBoolean()
  reviewAcknowledged?: boolean;
}
