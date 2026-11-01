import { BaseApiClient } from '@/shared/api/BaseApiClient';
import { LoaderStore } from '@/app/stores/LoaderStore';
import { OverviewService } from './OverviewService';

describe('OverviewService', () => {
  it('serializes the selected period into the overview endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          currency: 'USD',
          availableCurrencies: ['EUR', 'USD'],
          expenseCategories: [],
          incomeCategories: [],
          period: { from: '2025-01-01', to: '2025-01-31' },
          accountsCount: 0,
          totals: { income: 0, expenses: 0, net: 0 },
          cashflow: [],
          recentTransactions: [],
        }),
      ),
    );
    const service = new OverviewService(
      new BaseApiClient({ baseUrl: '/api', loaderStore: new LoaderStore(), fetchImpl }),
    );

    const summary = await service.getSummary({
      from: '2025-01-01',
      to: '2025-01-31',
      currency: 'USD',
    });
    expect(summary.currency).toBe('USD');
    expect(summary.availableCurrencies).toEqual(['EUR', 'USD']);

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/overview?from=2025-01-01&to=2025-01-31&currency=USD',
      expect.objectContaining({ method: 'GET' }),
    );
  });
  it.each([
    {},
    { currency: '', availableCurrencies: [] },
    { currency: 'USD', availableCurrencies: ['invalid'] },
  ])(
    'rejects missing or malformed currency data instead of substituting RUB: %j',
    async (currencies) => {
      const fetchImpl = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...currencies,
            period: { from: '2025-01-01', to: '2025-01-31' },
            accountsCount: 0,
            totals: { income: 0, expenses: 0, net: 0 },
            cashflow: [],
            recentTransactions: [],
            expenseCategories: [],
            incomeCategories: [],
          }),
        ),
      );
      const service = new OverviewService(
        new BaseApiClient({ baseUrl: '/api', loaderStore: new LoaderStore(), fetchImpl }),
      );
      await expect(service.getSummary({ from: '2025-01-01', to: '2025-01-31' })).rejects.toThrow();
    },
  );
});
