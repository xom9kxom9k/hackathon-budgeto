import { makeAutoObservable, runInAction } from 'mobx';

import type { AuthStatus, AuthUser } from '@/entities/auth/model/types';
import { ApiError } from '@/shared/api/errors';
import type { AuthService } from '@/shared/services/AuthService';

export class AuthStore {
  status: AuthStatus = 'unknown';
  isBootstrapping = true;
  user: AuthUser | null = null;
  challengeToken: string | null = null;
  otpauthUri: string | null = null;
  recoveryCodes: string[] = [];
  error: string | null = null;
  private bootstrapPromise: Promise<void> | null = null;

  constructor(private readonly service: AuthService) {
    makeAutoObservable<this, 'service' | 'bootstrapPromise'>(
      this,
      { service: false, bootstrapPromise: false },
      { autoBind: true },
    );
  }

  async bootstrap(): Promise<void> {
    if (!this.isBootstrapping || this.bootstrapPromise) {
      return this.bootstrapPromise ?? Promise.resolve();
    }

    this.status = 'loading';
    this.bootstrapPromise = this.loadCurrentUser();
    return this.bootstrapPromise;
  }

  async register(email: string, password: string): Promise<void> {
    this.setLoading();
    try {
      const result = await this.service.register(email, password);
      runInAction(() => {
        this.challengeToken = result.challengeToken;
        this.otpauthUri = result.otpauthUri;
        this.error = null;
        this.status = 'anonymous';
      });
    } catch (error) {
      runInAction(() => this.setError(error));
      throw error;
    }
  }

  async completeRegistration(code: string): Promise<void> {
    if (!this.challengeToken) throw new Error('Registration challenge is missing');
    this.setLoading();
    try {
      const result = await this.service.completeRegistration(this.challengeToken, code);
      runInAction(() => {
        this.user = result.user;
        this.recoveryCodes = result.recoveryCodes;
        this.clearChallenge();
        this.error = null;
        this.status = 'authenticated';
      });
    } catch (error) {
      runInAction(() => this.setError(error));
      throw error;
    }
  }

  async login(email: string, password: string): Promise<void> {
    this.setLoading();
    try {
      const result = await this.service.login(email, password);
      runInAction(() => {
        this.challengeToken = result.challengeToken;
        this.error = null;
        this.status = 'anonymous';
      });
    } catch (error) {
      runInAction(() => this.setError(error));
      throw error;
    }
  }

  async completeLogin(code: string): Promise<void> {
    if (!this.challengeToken) throw new Error('Login challenge is missing');
    this.setLoading();
    try {
      const result = await this.service.completeLogin(this.challengeToken, code);
      runInAction(() => {
        this.user = result.user;
        this.clearChallenge();
        this.error = null;
        this.status = 'authenticated';
      });
    } catch (error) {
      runInAction(() => this.setError(error));
      throw error;
    }
  }

  async useRecoveryCode(code: string): Promise<void> {
    if (!this.challengeToken) throw new Error('Login challenge is missing');
    this.setLoading();
    try {
      const result = await this.service.useRecoveryCode(this.challengeToken, code);
      runInAction(() => {
        this.user = result.user;
        this.clearChallenge();
        this.error = null;
        this.status = 'authenticated';
      });
    } catch (error) {
      runInAction(() => this.setError(error));
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.service.logout();
    } finally {
      runInAction(() => {
        this.user = null;
        this.status = 'anonymous';
        this.clearChallenge();
        this.recoveryCodes = [];
        this.error = null;
      });
    }
  }

  clearError(): void {
    this.error = null;
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const user = await this.service.getCurrentUser();
      runInAction(() => {
        this.user = user;
        this.status = 'authenticated';
        this.isBootstrapping = false;
      });
    } catch (error) {
      runInAction(() => {
        if (!(error instanceof ApiError) || error.status !== 401) {
          this.error = error instanceof ApiError ? (error.code ?? null) : null;
        }
        this.status = 'anonymous';
        this.isBootstrapping = false;
      });
    }
  }

  private setLoading(): void {
    this.status = 'loading';
    this.error = null;
  }

  private setError(error: unknown): void {
    this.status = 'anonymous';
    this.error = error instanceof ApiError ? (error.code ?? null) : null;
  }

  private clearChallenge(): void {
    this.challengeToken = null;
    this.otpauthUri = null;
  }
}
