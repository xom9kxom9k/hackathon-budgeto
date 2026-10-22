import { z } from 'zod';

import type { HealthData } from '@/app/stores/HealthStore';

import { BaseApiService } from './BaseApiService';

const healthResponseSchema = z.object({ status: z.string() });

export class HealthService extends BaseApiService {
  static override readonly prefix = '/health';

  async getHealth(signal?: AbortSignal): Promise<HealthData> {
    const response = await this.get('', healthResponseSchema, signal);

    return { status: response.status };
  }
}
