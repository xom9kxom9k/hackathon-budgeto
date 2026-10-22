import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class TotpChallengeDto {
  @IsString()
  @MinLength(20)
  challengeToken!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class RecoveryChallengeDto {
  @IsString()
  @MinLength(20)
  challengeToken!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9-]{8,64}$/)
  code!: string;
}

export class CompleteOnboardingDto {
  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(80)
  displayName!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsIn(['accounts', 'transactions', 'imports'], { each: true })
  goals!: string[];
}
