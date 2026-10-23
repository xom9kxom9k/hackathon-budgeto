import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { VaultService } from './vault.service';
import { RegisterVaultKeyCommand } from './vault.commands';
import {
  GetVaultEventQuery,
  GetVaultKeyQuery,
  ListVaultEventsQuery,
  VerifyVaultIntegrityQuery,
} from './vault.queries';

@CommandHandler(RegisterVaultKeyCommand)
export class RegisterVaultKeyHandler implements ICommandHandler<RegisterVaultKeyCommand> {
  constructor(private readonly vault: VaultService) {}

  execute(command: RegisterVaultKeyCommand) {
    return this.vault.registerKey(
      command.userId,
      command.publicKey,
      command.encryptedPrivateKey,
      command.keyVersion,
    );
  }
}

@QueryHandler(ListVaultEventsQuery)
export class ListVaultEventsHandler implements IQueryHandler<ListVaultEventsQuery> {
  constructor(private readonly vault: VaultService) {}

  execute(query: ListVaultEventsQuery) {
    return this.vault.listEvents(query.userId);
  }
}

@QueryHandler(GetVaultEventQuery)
export class GetVaultEventHandler implements IQueryHandler<GetVaultEventQuery> {
  constructor(private readonly vault: VaultService) {}

  execute(query: GetVaultEventQuery) {
    return this.vault.getEvent(query.userId, query.eventId);
  }
}

@QueryHandler(VerifyVaultIntegrityQuery)
export class VerifyVaultIntegrityHandler implements IQueryHandler<VerifyVaultIntegrityQuery> {
  constructor(private readonly vault: VaultService) {}

  execute(query: VerifyVaultIntegrityQuery) {
    return this.vault.verifyIntegrity(query.userId);
  }
}

@QueryHandler(GetVaultKeyQuery)
export class GetVaultKeyHandler implements IQueryHandler<GetVaultKeyQuery> {
  constructor(private readonly vault: VaultService) {}

  execute(query: GetVaultKeyQuery) {
    return this.vault.getKey(query.userId);
  }
}

export const vaultCommandHandlers = [RegisterVaultKeyHandler];
export const vaultQueryHandlers = [
  ListVaultEventsHandler,
  GetVaultEventHandler,
  VerifyVaultIntegrityHandler,
  GetVaultKeyHandler,
];
