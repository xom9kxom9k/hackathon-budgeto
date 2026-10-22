import { BaseApiClient } from '@/shared/api/BaseApiClient';
import { LoaderStore } from '@/app/stores/LoaderStore';

import { HealthService } from './HealthService';

describe('BaseApiService', () => {
  it('uses the service prefix injected through the constructor', async () => {
    const loaderStore = new LoaderStore();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
    const client = new BaseApiClient({ baseUrl: '/api', fetchImpl, loaderStore });
    const service = new HealthService(client);

    await expect(service.getHealth()).resolves.toEqual({ status: 'ok' });
    expect(fetchImpl).toHaveBeenCalledWith('/api/health', expect.any(Object));
  });
});
