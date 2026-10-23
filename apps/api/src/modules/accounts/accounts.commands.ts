import { AccountEntity } from './entities/account.entity';
import { AccountView } from './queries/list-accounts.query';

export class CreateAccountCommand {
  constructor(public readonly userId: string, public readonly name: string, public readonly currency: string) {}
}

export class UpdateAccountCommand {
  constructor(public readonly userId: string, public readonly id: string, public readonly name: string) {}
}

export class ArchiveAccountCommand {
  constructor(public readonly userId: string, public readonly id: string) {}
}

export type AccountMutationResult = AccountView & { archivedAt: string | null };
export type AccountCommandEntity = AccountEntity;
