import type { BaseApiClient } from '@/shared/api/BaseApiClient';
import { TransactionsService } from './TransactionsService';

describe('TransactionsService', () => {
  it('serializes filters into the transactions endpoint', async () => {
    const request = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
    });
    const service = new TransactionsService({
      request,
    } as unknown as BaseApiClient);

    await service.list({
      page: 1,
      pageSize: 50,
      accountId: 'account-1',
      kind: 'expense',
      query: 'coffee',
      from: '2025-01-01',
      to: '2025-01-31',
    });

    expect(request).toHaveBeenCalledWith(
      '/transactions?page=1&pageSize=50&accountId=account-1&kind=expense&q=coffee&from=2025-01-01&to=2025-01-31',
      expect.objectContaining({ method: 'GET' }),
      expect.anything(),
    );
  });
});
