import { makeAutoObservable, runInAction } from 'mobx';
import type { Profile, ProfileService } from '@/shared/services/ProfileService';
import type { RequestStatus } from '@/shared/types/request';
export class ProfileStore {
  status: RequestStatus = 'idle';
  profile: Profile | null = null;
  errorCode: string | null = null;
  private promise: Promise<void> | null = null;
  constructor(private readonly service: ProfileService) { makeAutoObservable(this, { service: false, promise: false }, { autoBind: true }); }
  async load(): Promise<void> { if (this.status === 'success' || this.promise) return this.promise ?? Promise.resolve(); this.status = 'loading'; this.promise = this.service.get().then((profile) => runInAction(() => { this.profile = profile; this.status = 'success'; })).catch((error: unknown) => runInAction(() => { this.status = 'error'; this.errorCode = error instanceof Error ? error.message : 'PROFILE_LOAD_FAILED'; })).finally(() => { this.promise = null; }); return this.promise; }
  async update(displayName: string, goals: string[]): Promise<void> { this.profile = await this.service.update(displayName, goals); this.status = 'success'; }
  async updatePreferences(locale?: string, timezone?: string): Promise<void> { this.profile = await this.service.updatePreferences(locale, timezone); this.status = 'success'; }
}
