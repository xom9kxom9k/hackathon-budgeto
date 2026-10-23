import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { TransactionKind } from './entities/transaction.entity';
import {
  ListTransactionsFilters,
  ListTransactionsQuery,
  TransactionsPageView,
} from './queries/list-transactions.query';

@Controller('transactions')
@UseGuards(AuthGuard)
export class TransactionsController {
  constructor(private readonly queries: QueryBus) {}

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
