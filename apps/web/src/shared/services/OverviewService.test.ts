import type { BaseApiClient } from '@/shared/api/BaseApiClient';
import { OverviewService } from './OverviewService';

describe('OverviewService', () => {
  it('serializes the selected period into the overview endpoint', async () => {
    const request = vi.fn().mockResolvedValue({
      period: { from: '2025-01-01', to: '2025-01-31' },
      accountsCount: 0,
      totals: { income: 0, expenses: 0, net: 0 },
      cashflow: [],
      recentTransactions: [],
    });
    const service = new OverviewService({ request } as unknown as BaseApiClient);

    await service.getSummary({ from: '2025-01-01', to: '2025-01-31' });

    expect(request).toHaveBeenCalledWith(
      '/overview?from=2025-01-01&to=2025-01-31',
      expect.objectContaining({ method: 'GET' }),
      expect.anything(),
    );
  });
});
