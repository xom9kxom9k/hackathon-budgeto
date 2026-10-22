import { makeAutoObservable } from 'mobx';

import type { HealthService } from '@/shared/services/HealthService';
import type { RequestStatus } from '@/shared/types/request';

export interface HealthData {
  status: string;
}

export class HealthStore {
  status: RequestStatus = 'idle';
  data: HealthData | null = null;
  error: string | null = null;

  constructor(private readonly healthService: HealthService) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async refresh(): Promise<void> {
    this.status = 'loading';
    this.error = null;

    try {
      this.data = await this.healthService.getHealth();
      this.status = 'success';
    } catch (error) {
      this.status = 'error';
      this.error = error instanceof Error ? error.message : 'Unknown API error';
    }
  }
}
