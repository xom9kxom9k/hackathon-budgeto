import type { TransactionView } from './list-transactions.query';
import type { TransactionMutationInput } from '../transactions.commands';

export class GetTransactionQuery {
  constructor(
    public readonly userId: string,
    public readonly transactionId: string,
  ) {}
}

export type TransactionDetailView = TransactionView & { reversedAt: string | null };

export class PrepareTransactionClaimQuery {
  constructor(
    public readonly userId: string,
    public readonly input: Omit<TransactionMutationInput, 'proof'>,
  ) {}
}
