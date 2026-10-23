import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  @Matches(/\S/)
  name!: string;

  @IsString()
  @Matches(/^[A-Za-z]{3}$/)
  currency!: string;
}

export class UpdateAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  @Matches(/\S/)
  name!: string;
}
