import { z } from 'zod';
import { BaseApiService } from './BaseApiService';
import type { BaseApiClient } from '@/shared/api/BaseApiClient';

const sessionSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
  expiresAt: z.string(),
  revokedAt: z.string().nullable(),
});
const statusSchema = z.object({
  totpEnabled: z.boolean(),
  recoveryAvailable: z.boolean(),
  vaultKeyConfigured: z.boolean(),
});
export type SecuritySession = z.infer<typeof sessionSchema>;
export type SecurityStatus = z.infer<typeof statusSchema>;
export class SecurityService extends BaseApiService {
  constructor(client: BaseApiClient) {
    super(client, '/security');
  }
  sessions(): Promise<SecuritySession[]> {
    return this.get('/sessions', sessionSchema.array());
  }
  status(): Promise<SecurityStatus> {
    return this.get('/status', statusSchema);
  }
  revoke(id: string): Promise<void> {
    return this.post(`/${encodeURIComponent(id)}/revoke`, {}, z.unknown()).then(() => undefined);
  }
  revokeAll(): Promise<void> {
    return this.post('/sessions/revoke-all', {}, z.unknown()).then(() => undefined);
  }
}
