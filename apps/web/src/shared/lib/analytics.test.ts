import { cashflowBuckets, savingsEstimate } from './analytics';

describe('cashflowBuckets', () => {
  it('fills inactive days and keeps cents when grouping long periods', () => {
    const daily = cashflowBuckets(
      [{ period: '2026-10-02', income: 0.1, expenses: 0.2 }],
      '2026-10-01',
      '2026-10-03',
    );
    expect(daily.points).toHaveLength(3);
    expect(daily.points[0].income).toBe(0);
    const weekly = cashflowBuckets(
      [
        { period: '2026-09-01', income: 0.1, expenses: 0.2 },
        { period: '2026-09-02', income: 0.2, expenses: 0.1 },
        { period: '2026-08-31', income: 999, expenses: 999 },
      ],
      '2026-09-01',
      '2026-10-31',
    );
    expect(weekly.step).toBe(7);
    expect(weekly.points[0]).toMatchObject({ income: 0.3, expenses: 0.3 });
    expect(weekly.points.at(-1)?.end).toBe('2026-10-31');
  });
  it('rejects an invalid period', () => {
    expect(cashflowBuckets([], 'invalid', '2026-10-31').points).toEqual([]);
    expect(cashflowBuckets([], '2026-11-01', '2026-10-31').points).toEqual([]);
  });
});
describe('savingsEstimate', () => {
  const estimate = (net: number, from = '2026-10-01', to = '2026-10-31', saved = 0) =>
    savingsEstimate(3100, saved, net, from, to, '2026-11-01');
  it('projects remaining money using inclusive completed period days', () => {
    expect(estimate(3100)).toMatchObject({ status: 'ready', days: 31, date: '2026-12-02' });
    expect(estimate(3100, undefined, undefined, 3000)).toMatchObject({ days: 1 });
  });
  it('does not invent dates for a deficit or insufficient history', () => {
    expect(estimate(-50).status).toBe('deficit');
    expect(estimate(0).status).toBe('deficit');
    expect(estimate(100, '2026-10-25').status).toBe('period');
    expect(estimate(100, '2026-10-01', '2026-11-01').status).toBe('period');
    expect(estimate(0.01).status).toBe('distant');
    expect(estimate(-50, undefined, undefined, 3200).status).toBe('complete');
  });
});
