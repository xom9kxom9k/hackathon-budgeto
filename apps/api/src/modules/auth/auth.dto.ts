import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

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
