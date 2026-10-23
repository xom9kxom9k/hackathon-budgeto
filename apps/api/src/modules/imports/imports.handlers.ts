import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ImportsService } from './imports.service';
import {
  ConfirmImportJobCommand,
  ConfirmImportWithProofsCommand,
  CreateImportJobCommand,
  DeleteImportStagingCommand,
  RetryImportJobCommand,
  UpdateImportRowsCommand,
} from './imports.commands';
import {
  GetImportJobQuery,
  GetImportTemplateQuery,
  PrepareImportConfirmationQuery,
  ListImportJobsQuery,
} from './imports.queries';
import { VaultService } from '../vault/vault.service';

@CommandHandler(CreateImportJobCommand)
export class CreateImportJobHandler implements ICommandHandler<CreateImportJobCommand> {
  constructor(private readonly imports: ImportsService) {}

  execute(command: CreateImportJobCommand) {
    return this.imports.create(command.userId, command.fileName, command.content);
  }
}

@CommandHandler(UpdateImportRowsCommand)
export class UpdateImportRowsHandler implements ICommandHandler<UpdateImportRowsCommand> {
  constructor(private readonly imports: ImportsService) {}

  execute(command: UpdateImportRowsCommand) {
    return this.imports.updateRows(command.userId, command.jobId, command.rows);
  }
}

@CommandHandler(ConfirmImportJobCommand)
export class ConfirmImportJobHandler implements ICommandHandler<ConfirmImportJobCommand> {
  constructor(private readonly imports: ImportsService) {}

  execute(command: ConfirmImportJobCommand) {
    return this.imports.confirm(command.userId, command.jobId);
  }
}

@CommandHandler(ConfirmImportWithProofsCommand)
export class ConfirmImportWithProofsHandler implements ICommandHandler<ConfirmImportWithProofsCommand> {
  constructor(private readonly imports: ImportsService) {}

  execute(command: ConfirmImportWithProofsCommand) {
    return this.imports.confirm(command.userId, command.jobId, command.proofs);
  }
}

@CommandHandler(RetryImportJobCommand)
export class RetryImportJobHandler implements ICommandHandler<RetryImportJobCommand> {
  constructor(private readonly imports: ImportsService) {}
  execute(command: RetryImportJobCommand) {
    return this.imports.retry(command.userId, command.jobId);
  }
}

@CommandHandler(DeleteImportStagingCommand)
export class DeleteImportStagingHandler implements ICommandHandler<DeleteImportStagingCommand> {
  constructor(private readonly imports: ImportsService) {}
  async execute(command: DeleteImportStagingCommand) {
    await this.imports.deleteStaging(command.userId, command.jobId);
    return { deleted: true };
  }
}

@QueryHandler(GetImportJobQuery)
export class GetImportJobHandler implements IQueryHandler<GetImportJobQuery> {
  constructor(private readonly imports: ImportsService) {}

  execute(query: GetImportJobQuery) {
    return this.imports.getView(query.userId, query.jobId);
  }
}

@QueryHandler(ListImportJobsQuery)
export class ListImportJobsHandler implements IQueryHandler<ListImportJobsQuery> {
  constructor(private readonly imports: ImportsService) {}
  execute(query: ListImportJobsQuery) {
    return this.imports.list(query.userId);
  }
}

@QueryHandler(GetImportTemplateQuery)
export class GetImportTemplateHandler implements IQueryHandler<GetImportTemplateQuery> {
  constructor(private readonly imports: ImportsService) {}

  execute() {
    return this.imports.template();
  }
}

@QueryHandler(PrepareImportConfirmationQuery)
export class PrepareImportConfirmationHandler implements IQueryHandler<PrepareImportConfirmationQuery> {
  constructor(private readonly vault: VaultService) {}

  execute(query: PrepareImportConfirmationQuery) {
    return this.vault.prepareImportConfirmation(query.userId, query.jobId);
  }
}

export const importCommandHandlers = [
  CreateImportJobHandler,
  UpdateImportRowsHandler,
  ConfirmImportJobHandler,
  ConfirmImportWithProofsHandler,
  RetryImportJobHandler,
  DeleteImportStagingHandler,
];

export const importQueryHandlers = [
  GetImportJobHandler,
  GetImportTemplateHandler,
  PrepareImportConfirmationHandler,
  ListImportJobsHandler,
];
