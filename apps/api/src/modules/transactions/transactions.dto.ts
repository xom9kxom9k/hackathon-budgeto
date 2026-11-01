import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { TransactionKind } from './entities/transaction.entity';
import { VaultProofDto } from '../vault/vault.dto';

export class TransactionClaimDto {
  @IsDateString() date!: string;
  @IsEnum(TransactionKind) kind!: TransactionKind;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
  @IsUUID() accountId!: string;
  @IsOptional() @IsUUID() destinationAccountId?: string | null;
  @IsOptional() @IsUUID() categoryId?: string | null;
  @IsOptional() @IsString() @MaxLength(500) note?: string | null;
  @IsUUID() operationId!: string;
}

export class TransactionMutationDto extends TransactionClaimDto {
  @IsObject() proof!: VaultProofDto;
}
