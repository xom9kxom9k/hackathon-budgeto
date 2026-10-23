import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsString,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;

  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(32, { each: true })
  goals!: string[];
}

export class UpdateProfilePreferencesDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsIn(['ru', 'en'])
  locale?: string;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(100)
  timezone?: string;
}
