import { makeAutoObservable, runInAction } from 'mobx';
import type { Profile, ProfileService } from '@/shared/services/ProfileService';
import type { RequestStatus } from '@/shared/types/request';
export class ProfileStore {
  status: RequestStatus = 'idle';
  mutationStatus: 'idle' | 'saving' | 'success' | 'error' = 'idle';
  profile: Profile | null = null;
  errorCode: string | null = null;
  mutationErrorCode: string | null = null;
  private promise: Promise<void> | null = null;
  constructor(private readonly service: ProfileService) {
    makeAutoObservable<this, 'service' | 'promise'>(
      this,
      { service: false, promise: false },
      { autoBind: true },
    );
  }
  async load(): Promise<void> {
    if (this.status === 'success' || this.promise) return this.promise ?? Promise.resolve();
    this.status = 'loading';
    this.promise = this.service
      .get()
      .then((profile) =>
        runInAction(() => {
          this.profile = profile;
          this.status = 'success';
        }),
      )
      .catch((error: unknown) =>
        runInAction(() => {
          this.status = 'error';
          this.errorCode = error instanceof Error ? error.message : 'PROFILE_LOAD_FAILED';
        }),
      )
      .finally(() => {
        this.promise = null;
      });
    return this.promise;
  }
  async update(displayName: string, goals: string[]): Promise<void> {
    this.mutationStatus = 'saving';
    this.mutationErrorCode = null;
    try {
      const profile = await this.service.update(displayName, goals);
      runInAction(() => {
        this.profile = profile;
        this.status = 'success';
        this.mutationStatus = 'success';
      });
    } catch (error: unknown) {
      runInAction(() => {
        this.mutationStatus = 'error';
        this.mutationErrorCode = error instanceof Error ? error.message : 'PROFILE_UPDATE_FAILED';
      });
      throw error;
    }
  }

  async updatePreferences(locale?: string, timezone?: string): Promise<void> {
    this.mutationStatus = 'saving';
    this.mutationErrorCode = null;
    try {
      const profile = await this.service.updatePreferences(locale, timezone);
      runInAction(() => {
        this.profile = profile;
        this.status = 'success';
        this.mutationStatus = 'success';
      });
    } catch (error: unknown) {
      runInAction(() => {
        this.mutationStatus = 'error';
        this.mutationErrorCode = error instanceof Error ? error.message : 'PROFILE_UPDATE_FAILED';
      });
      throw error;
    }
  }

  resetMutation(): void {
    this.mutationStatus = 'idle';
    this.mutationErrorCode = null;
  }
}
