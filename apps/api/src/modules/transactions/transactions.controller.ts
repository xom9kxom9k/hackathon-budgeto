import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { TransactionKind } from './entities/transaction.entity';
import {
  ListTransactionsFilters,
  ListTransactionsQuery,
  TransactionsPageView,
} from './queries/list-transactions.query';
import {
  CreateTransactionCommand,
  ReverseTransactionCommand,
  UpdateTransactionCommand,
} from './transactions.commands';
import { TransactionMutationDto } from './transactions.dto';
import { GetTransactionQuery, PrepareTransactionClaimQuery } from './queries/get-transaction.query';

@Controller('transactions')
@UseGuards(AuthGuard)
export class TransactionsController {
  constructor(
    private readonly queries: QueryBus,
    private readonly commands: CommandBus,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthPrincipal,
    @Query() query: Record<string, string | undefined>,
  ): Promise<TransactionsPageView> {
    const filters = this.parseFilters(query);
    return this.queries.execute<ListTransactionsQuery, TransactionsPageView>(
      new ListTransactionsQuery(user.userId, filters),
    );
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.queries.execute(new GetTransactionQuery(user.userId, id));
  }

  @Post('claims')
  prepareClaim(@CurrentUser() user: AuthPrincipal, @Body() body: TransactionMutationDto) {
    const { proof, ...input } = normalizeInput(body);
    void proof;
    return this.queries.execute(new PrepareTransactionClaimQuery(user.userId, input));
  }

  @Post()
  create(@CurrentUser() user: AuthPrincipal, @Body() body: TransactionMutationDto) {
    return this.commands.execute(new CreateTransactionCommand(user.userId, normalizeInput(body)));
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() body: TransactionMutationDto,
  ) {
    return this.commands.execute(
      new UpdateTransactionCommand(user.userId, id, normalizeInput(body)),
    );
  }

  @Post(':id/reverse')
  reverse(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body('operationId') operationId: string,
    @Body('proof') proof: TransactionMutationDto['proof'],
  ) {
    return this.commands.execute(
      new ReverseTransactionCommand(user.userId, id, operationId, proof),
    );
  }

  private parseFilters(query: Record<string, string | undefined>): ListTransactionsFilters {
    const page = this.parseInteger(query.page, 1);
    const pageSize = this.parseInteger(query.pageSize, 50, 100);
    const kind = query.kind as TransactionKind | undefined;

    if (kind && !Object.values(TransactionKind).includes(kind)) {
      throw new BadRequestException('Invalid transaction kind');
    }
    for (const value of [query.from, query.to]) {
      if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new BadRequestException('Invalid transaction date');
      }
    }

    return {
      page,
      pageSize,
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(kind ? { kind } : {}),
      ...(query.q?.trim() ? { query: query.q.trim() } : {}),
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
    };
  }

  private parseInteger(
    value: string | undefined,
    fallback: number,
    maximum = Number.MAX_SAFE_INTEGER,
  ): number {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
      throw new BadRequestException('Invalid pagination value');
    }
    return parsed;
  }
}

function normalizeInput(body: TransactionMutationDto) {
  return {
    date: body.date,
    kind: body.kind,
    amount: body.amount,
    accountId: body.accountId,
    destinationAccountId: body.destinationAccountId ?? null,
    categoryId: body.categoryId ?? null,
    note: body.note ?? null,
    operationId: body.operationId,
    proof: body.proof,
  };
}
