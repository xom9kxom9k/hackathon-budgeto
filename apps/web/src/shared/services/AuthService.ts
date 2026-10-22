import { z } from 'zod';

import type { AuthUser } from '@/entities/auth/model/types';
import { BaseApiClient } from '@/shared/api/BaseApiClient';

import { BaseApiService } from './BaseApiService';

const userSchema = z.object({ id: z.string(), email: z.string().email() });
const challengeSchema = z.object({ challengeToken: z.string() });
const setupSchema = z.object({ challengeToken: z.string(), otpauthUri: z.string() });
const sessionSchema = z.object({ user: userSchema });
const registrationSchema = z.object({ user: userSchema, recoveryCodes: z.array(z.string()) });

export class AuthService extends BaseApiService {
  constructor(apiClient: BaseApiClient) {
    super(apiClient, '/auth');
  }

  async getCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
    const response = await this.get('/me', sessionSchema, signal);
    return response.user;
  }

  register(email: string, password: string): Promise<z.infer<typeof setupSchema>> {
    return this.post('/register', { email, password }, setupSchema);
  }

  completeRegistration(
    challengeToken: string,
    code: string,
  ): Promise<z.infer<typeof registrationSchema>> {
    return this.post('/register/totp', { challengeToken, code }, registrationSchema);
  }

  login(email: string, password: string): Promise<z.infer<typeof challengeSchema>> {
    return this.post('/login', { email, password }, challengeSchema);
  }

  completeLogin(challengeToken: string, code: string): Promise<z.infer<typeof sessionSchema>> {
    return this.post('/login/totp', { challengeToken, code }, sessionSchema);
  }

  useRecoveryCode(challengeToken: string, code: string): Promise<z.infer<typeof sessionSchema>> {
    return this.post('/login/recovery', { challengeToken, code }, sessionSchema);
  }

  async logout(): Promise<void> {
    await this.post('/logout', {}, z.undefined());
  }
}
