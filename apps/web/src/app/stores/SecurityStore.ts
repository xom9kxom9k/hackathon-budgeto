import { makeAutoObservable, runInAction } from 'mobx';
import type { SecurityService, SecuritySession, SecurityStatus } from '@/shared/services/SecurityService';
export class SecurityStore {
  loading = false; errorCode: string | null = null; sessions: SecuritySession[] = []; status: SecurityStatus | null = null;
  constructor(private readonly service: SecurityService) { makeAutoObservable(this, { service: false }, { autoBind: true }); }
  async load(): Promise<void> { this.loading = true; this.errorCode = null; try { const [sessions, status] = await Promise.all([this.service.sessions(), this.service.status()]); runInAction(() => { this.sessions = sessions; this.status = status; }); } catch (error) { runInAction(() => { this.errorCode = error instanceof Error ? error.message : 'SECURITY_LOAD_FAILED'; }); } finally { this.loading = false; } }
  async revoke(id: string): Promise<void> { await this.service.revoke(id); await this.load(); }
  async revokeAll(): Promise<void> { await this.service.revokeAll(); await this.load(); }
}
