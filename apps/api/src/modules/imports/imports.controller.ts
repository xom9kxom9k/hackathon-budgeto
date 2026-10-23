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
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { ImportsService } from './imports.service';

@Controller('imports')
@UseGuards(AuthGuard)
export class ImportsController {
  constructor(private readonly service: ImportsService) {}

  @Get('template')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="budgeto-import-template.xlsx"')
  async template(): Promise<Buffer> {
    return this.service.template();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @CurrentUser() user: AuthPrincipal,
    @UploadedFile() file: { originalname: string; buffer: Buffer },
  ): Promise<unknown> {
    return this.service.create(user.userId, file.originalname, file.buffer);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string): Promise<unknown> {
    return this.service.getView(user.userId, id);
  }

  @Patch(':id/rows')
  async rows(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body('rows') rows: unknown[],
  ): Promise<unknown> {
    return this.service.updateRows(user.userId, id, rows as never[]);
  }

  @Post(':id/confirm')
  async confirm(@CurrentUser() user: AuthPrincipal, @Param('id') id: string): Promise<unknown> {
    return this.service.confirm(user.userId, id);
  }
}
