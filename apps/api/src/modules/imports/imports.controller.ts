import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { ImportErrorFilter } from './import-error.filter';
import { ImportErrorCode } from '../../shared/import-parser/import-errors';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import {
  ConfirmImportWithProofsCommand,
  CreateImportJobCommand,
  DeleteImportStagingCommand,
  RetryImportJobCommand,
  UpdateImportRowsCommand,
} from './imports.commands';
import {
  GetImportJobQuery,
  GetImportTemplateQuery,
  ListImportJobsQuery,
  PrepareImportConfirmationQuery,
} from './imports.queries';
import { UpdateImportRowsDto } from './imports.dto';
import type { VaultProofDto } from '../vault/vault.dto';

@Controller('imports')
@UseGuards(AuthGuard)
@UseFilters(ImportErrorFilter)
export class ImportsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get('template')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="budgeto-import-template.xlsx"')
  async template(): Promise<Buffer> {
    return this.queries.execute<GetImportTemplateQuery, Buffer>(new GetImportTemplateQuery());
  }

  @Get()
  async list(@CurrentUser() user: AuthPrincipal) {
    return this.queries.execute(new ListImportJobsQuery(user.userId));
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024, files: 1 } }))
  async create(
    @CurrentUser() user: AuthPrincipal,
    @UploadedFile() file?: { originalname: string; buffer: Buffer },
  ): Promise<unknown> {
    if (!file) throw new BadRequestException(ImportErrorCode.IMPORT_FILE_REQUIRED);
    return this.commands.execute(
      new CreateImportJobCommand(user.userId, file.originalname, file.buffer),
    );
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string): Promise<unknown> {
    return this.queries.execute(new GetImportJobQuery(user.userId, id));
  }

  @Patch(':id/rows')
  async rows(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() body: UpdateImportRowsDto,
  ): Promise<unknown> {
    return this.commands.execute(
      new UpdateImportRowsCommand(
        user.userId,
        id,
        body.rows.map((row) => ({
          ...row,
          sourceRef: row.sourceRef ?? { kind: 'xlsx', record: row.sourceRow },
        })),
        body.reviewAcknowledged,
      ),
    );
  }

  @Post(':id/confirm')
  async confirm(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body('proofs') proofs?: VaultProofDto[],
  ): Promise<unknown> {
    return this.commands.execute(new ConfirmImportWithProofsCommand(user.userId, id, proofs ?? []));
  }

  @Post(':id/retry')
  async retry(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.commands.execute(new RetryImportJobCommand(user.userId, id));
  }

  @Delete(':id/staging')
  async deleteStaging(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.commands.execute(new DeleteImportStagingCommand(user.userId, id));
  }

  @Get(':id/confirmation-claims')
  async confirmationClaims(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.queries.execute(new PrepareImportConfirmationQuery(user.userId, id));
  }
}
