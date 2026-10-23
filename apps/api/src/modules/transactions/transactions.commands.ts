import { TransactionKind } from './entities/transaction.entity';
import type { VaultProofDto } from '../vault/vault.dto';

export interface TransactionMutationInput {
  date: string;
  kind: TransactionKind;
  amount: number;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  note: string | null;
  operationId: string;
  proof: VaultProofDto;
}

export class CreateTransactionCommand {
  constructor(
    public readonly userId: string,
    public readonly input: TransactionMutationInput,
  ) {}
}

export class UpdateTransactionCommand {
  constructor(
    public readonly userId: string,
    public readonly transactionId: string,
    public readonly input: TransactionMutationInput,
  ) {}
}

export class ReverseTransactionCommand {
  constructor(
    public readonly userId: string,
    public readonly transactionId: string,
    public readonly operationId: string,
    public readonly proof: VaultProofDto,
  ) {}
}
