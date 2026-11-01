import { z } from 'zod';
import type { BaseApiClient } from '@/shared/api/BaseApiClient';
const goalSchema = z.object({
  name: z.string(),
  target: z.number().positive(),
  saved: z.number().nonnegative(),
  currency: z.string(),
});
export type SavingsGoal = z.infer<typeof goalSchema>;
export class SavingsService {
  constructor(private readonly client: BaseApiClient) {}
  async get(currency: string, signal?: AbortSignal): Promise<SavingsGoal | null> {
    const value = await this.client.request(
      `/savings-goals/${encodeURIComponent(currency)}`,
      { signal },
      goalSchema.nullish(),
    );
    return value ?? null;
  }
  save(currency: string, goal: Omit<SavingsGoal, 'currency'>): Promise<SavingsGoal> {
    return this.client.request(
      `/savings-goals/${encodeURIComponent(currency)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goal),
      },
      goalSchema,
    );
  }
}
