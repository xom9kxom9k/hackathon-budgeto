import { z } from 'zod';

import type { HealthData } from '@/app/stores/HealthStore';
import { BaseApiClient } from '@/shared/api/BaseApiClient';

import { BaseApiService } from './BaseApiService';

const healthResponseSchema = z.object({ status: z.string() });

export class HealthService extends BaseApiService {
  constructor(apiClient: BaseApiClient) {
    super(apiClient, '/health');
  }

  async getHealth(signal?: AbortSignal): Promise<HealthData> {
    const response = await this.get(healthResponseSchema, signal);

    return { status: response.status };
  }
}
