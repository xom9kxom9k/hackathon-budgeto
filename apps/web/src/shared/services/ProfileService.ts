import { z } from 'zod';
import { BaseApiService } from './BaseApiService';
import type { BaseApiClient } from '@/shared/api/BaseApiClient';

const profileSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string().nullable(),
  goals: z.array(z.string()),
  locale: z.string(),
  timezone: z.string(),
  createdAt: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

export class ProfileService extends BaseApiService {
  constructor(client: BaseApiClient) {
    super(client, '/profile');
  }
  get(): Promise<Profile> {
    return super.get(profileSchema);
  }
  update(displayName: string, goals: string[]): Promise<Profile> {
    return this.patch('', { displayName, goals }, profileSchema);
  }
  updatePreferences(locale?: string, timezone?: string): Promise<Profile> {
    return this.patch('/preferences', { locale, timezone }, profileSchema);
  }
}
