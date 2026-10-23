import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { GetOverviewSummaryQuery, OverviewPeriod, OverviewSummaryView } from './overview.queries';

@Controller('overview')
@UseGuards(AuthGuard)
export class OverviewController {
  constructor(private readonly queries: QueryBus) {}

  @Get()
  async summary(
    @CurrentUser() user: AuthPrincipal,
    @Query() query: Record<string, string | undefined>,
  ): Promise<OverviewSummaryView> {
    const period = this.parsePeriod(query);
    return this.queries.execute<GetOverviewSummaryQuery, OverviewSummaryView>(
      new GetOverviewSummaryQuery(user.userId, period),
    );
  }

  private parsePeriod(query: Record<string, string | undefined>): OverviewPeriod {
    const fallback = currentUtcMonth();
    const from = query.from ?? fallback.from;
    const to = query.to ?? fallback.to;

    if (!isIsoDate(from) || !isIsoDate(to)) {
      throw new BadRequestException('Invalid overview period');
    }
    if (from > to) throw new BadRequestException('Overview period is reversed');

    return { from, to };
  }
}

export function currentUtcMonth(date = new Date()): OverviewPeriod {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return {
    from: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    to: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}
