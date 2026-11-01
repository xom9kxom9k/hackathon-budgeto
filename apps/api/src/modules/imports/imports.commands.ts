import type { ParsedImportRow } from '../../shared/import-parser/types';
import type { VaultProofDto } from '../vault/vault.dto';

export class CreateImportJobCommand {
  constructor(
    public readonly userId: string,
    public readonly fileName: string,
    public readonly content: Buffer,
  ) {}
}

export class UpdateImportRowsCommand {
  constructor(
    public readonly userId: string,
    public readonly jobId: string,
    public readonly rows: ParsedImportRow[],
    public readonly reviewAcknowledged = false,
  ) {}
}

export class ConfirmImportJobCommand {
  constructor(
    public readonly userId: string,
    public readonly jobId: string,
  ) {}
}

export class ConfirmImportWithProofsCommand {
  constructor(
    public readonly userId: string,
    public readonly jobId: string,
    public readonly proofs: VaultProofDto[],
  ) {}
}

export class RetryImportJobCommand {
  constructor(
    public readonly userId: string,
    public readonly jobId: string,
  ) {}
}

export class DeleteImportStagingCommand {
  constructor(
    public readonly userId: string,
    public readonly jobId: string,
  ) {}
}
