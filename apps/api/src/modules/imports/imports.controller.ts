import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import {
  ConfirmImportJobCommand,
  CreateImportJobCommand,
  UpdateImportRowsCommand,
} from './imports.commands';
import { GetImportJobQuery, GetImportTemplateQuery } from './imports.queries';

@Controller('imports')
@UseGuards(AuthGuard)
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

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @CurrentUser() user: AuthPrincipal,
    @UploadedFile() file: { originalname: string; buffer: Buffer },
  ): Promise<unknown> {
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
    @Body('rows') rows: unknown[],
  ): Promise<unknown> {
    return this.commands.execute(new UpdateImportRowsCommand(user.userId, id, rows as never[]));
  }

  @Post(':id/confirm')
  async confirm(@CurrentUser() user: AuthPrincipal, @Param('id') id: string): Promise<unknown> {
    return this.commands.execute(new ConfirmImportJobCommand(user.userId, id));
  }
}
