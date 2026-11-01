import type { OverviewService } from '@/shared/services/OverviewService';
import { OverviewStore } from './OverviewStore';

const filters = { from: '2025-01-01', to: '2025-01-31' };
const summary = {
  currency: 'EUR',
  availableCurrencies: ['EUR', 'USD'],
  expenseCategories: [],
  incomeCategories: [],
  period: filters,
  accountsCount: 1,
  totals: { income: 1000, expenses: 250, net: 750 },
  cashflow: [{ period: '2025-01-01', income: 1000, expenses: 250 }],
  recentTransactions: [],
};

describe('OverviewStore', () => {
  it('has no assumed currency before the summary loads', () => {
    const store = new OverviewStore({} as OverviewService);
    expect(store.currency).toBeNull();
    expect(store.availableCurrencies).toEqual([]);
  });
  it('loads a summary once for the same period', async () => {
    const getSummary = vi.fn().mockResolvedValue(summary);
    const store = new OverviewStore({ getSummary } as unknown as OverviewService);

    await Promise.all([store.load(filters), store.load(filters)]);

    expect(getSummary).toHaveBeenCalledOnce();
    expect(store.status).toBe('success');
    expect(store.net).toBe(750);
    expect(store.currency).toBe('EUR');
    expect(store.availableCurrencies).toEqual(['EUR', 'USD']);
  });

  it('keeps an empty state when there are no accounts or transactions', async () => {
    const getSummary = vi.fn().mockResolvedValue({
      ...summary,
      accountsCount: 0,
      cashflow: [],
    });
    const store = new OverviewStore({ getSummary } as unknown as OverviewService);

    await store.load(filters);

    expect(store.status).toBe('empty');
    expect(store.cashflow).toEqual([]);
  });

  it('retries a failed period request', async () => {
    const getSummary = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(summary);
    const store = new OverviewStore({ getSummary } as unknown as OverviewService);

    await store.load(filters);
    expect(store.status).toBe('error');

    await store.retry();

    expect(store.status).toBe('success');
    expect(getSummary).toHaveBeenCalledTimes(2);
  });
  it('preserves the selected currency on refresh after a successful summary', async () => {
    const getSummary = vi.fn().mockResolvedValue({ ...summary, currency: 'USD' });
    const store = new OverviewStore({ getSummary } as unknown as OverviewService);
    await store.load({ ...filters, currency: 'USD' });
    await store.retry();
    expect(getSummary).toHaveBeenLastCalledWith({ ...filters, currency: 'USD' });
  });
});
