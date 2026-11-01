import type { CashflowPoint } from '@/entities/transaction/model/types';

const dayMs = 86_400_000;
export function periodDays(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / dayMs) + 1;
}

export function cashflowBuckets(data: CashflowPoint[], from: string, to: string) {
  const days = periodDays(from, to);
  if (!Number.isFinite(days) || days <= 0) return { points: [], step: 1 };
  const step = days <= 45 ? 1 : days <= 180 ? 7 : Math.ceil(days / 24);
  const start = Date.parse(from);
  const points = Array.from({ length: Math.ceil(days / step) }, (_, index) => ({
    period: new Date(start + index * step * dayMs).toISOString().slice(0, 10),
    end: new Date(Math.min(Date.parse(to), start + ((index + 1) * step - 1) * dayMs))
      .toISOString()
      .slice(0, 10),
    income: 0,
    expenses: 0,
  }));
  for (const point of data) {
    const index = Math.floor((Date.parse(point.period) - start) / dayMs / step);
    if (index >= 0 && index < points.length) {
      points[index].income += Math.round(point.income * 100);
      points[index].expenses += Math.round(point.expenses * 100);
    }
  }
  return {
    points: points.map((point) => ({
      ...point,
      income: point.income / 100,
      expenses: point.expenses / 100,
    })),
    step,
  };
}

export function savingsEstimate(
  target: number,
  saved: number,
  net: number,
  from: string,
  to: string,
  today = new Date().toISOString().slice(0, 10),
) {
  const remaining = Math.max(0, Math.round(target * 100) - Math.round(saved * 100));
  if (remaining === 0) return { status: 'complete' as const };
  const days = periodDays(from, to);
  if (!Number.isFinite(days) || days < 14 || to >= today) return { status: 'period' as const };
  if (net <= 0) return { status: 'deficit' as const };
  const duration = Math.ceil((remaining / Math.round(net * 100)) * days);
  if (!Number.isFinite(duration) || duration > 36_500) return { status: 'distant' as const };
  return {
    status: 'ready' as const,
    days: duration,
    monthly: (net / days) * 30.4375,
    date: new Date(Date.parse(today) + duration * dayMs).toISOString().slice(0, 10),
  };
}
