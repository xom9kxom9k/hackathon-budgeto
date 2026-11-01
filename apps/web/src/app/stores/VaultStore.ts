import { makeAutoObservable, runInAction } from 'mobx';

import type { ImportConfirmationClaims, VaultProof } from '@/shared/services/ImportService';
import type { TransactionClaim } from '@/shared/services/TransactionsService';
import type { VaultEvent, VaultIntegrity, VaultService } from '@/shared/services/VaultService';
import { VaultCrypto } from '@/shared/vault/VaultCrypto';

export type VaultStatus = 'unknown' | 'uninitialized' | 'locked' | 'unlocked' | 'error';

export class VaultStore {
  status: VaultStatus = 'unknown';
  keyBusy = false;
  eventsStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  verificationStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  errorCode: string | null = null;
  recoveryPhrase: string | null = null;
  events: VaultEvent[] = [];
  integrity: VaultIntegrity | null = null;
  private readonly crypto = new VaultCrypto();

  constructor(private readonly service: VaultService) {
    makeAutoObservable<this, 'service' | 'crypto'>(
      this,
      { service: false, crypto: false },
      { autoBind: true },
    );
  }

  async bootstrap(): Promise<void> {
    if (this.status !== 'unknown') return;
    try {
      const bundle = await this.service.getKey();
      runInAction(() => {
        this.status = bundle ? 'locked' : 'uninitialized';
        this.errorCode = null;
      });
    } catch (error) {
      this.setError(error);
    }
  }

  async retryBootstrap(): Promise<void> {
    this.status = 'unknown';
    await this.bootstrap();
  }

  async create(): Promise<string | null> {
    if (this.keyBusy) return null;
    this.keyBusy = true;
    try {
      const bundle = await this.crypto.createBundle();
      await this.service.registerKey(bundle);
      runInAction(() => {
        this.recoveryPhrase = bundle.recoveryPhrase;
        this.status = 'unlocked';
        this.errorCode = null;
      });
      return bundle.recoveryPhrase;
    } catch (error) {
      this.setError(error);
      return null;
    } finally {
      runInAction(() => {
        this.keyBusy = false;
      });
    }
  }

  async unlock(recoveryPhrase: string): Promise<boolean> {
    if (this.keyBusy) return false;
    this.keyBusy = true;
    try {
      const bundle = await this.service.getKey();
      if (!bundle) throw new Error('VAULT_NOT_INITIALIZED');
      await this.crypto.unlock(bundle, recoveryPhrase);
      runInAction(() => {
        this.status = 'unlocked';
        this.recoveryPhrase = null;
        this.errorCode = null;
      });
      return true;
    } catch (error) {
      runInAction(() => {
        this.status = 'locked';
        this.errorCode = error instanceof Error ? error.message : 'VAULT_FAILED';
      });
      return false;
    } finally {
      runInAction(() => {
        this.keyBusy = false;
      });
    }
  }

  async createProofs(
    claims: Array<ImportConfirmationClaims['claims'][number] | TransactionClaim>,
  ): Promise<VaultProof[]> {
    if (this.status !== 'unlocked') throw new Error('VAULT_KEY_REQUIRED');
    return Promise.all(claims.map((claim) => this.crypto.createProof(claim)));
  }

  async loadEvents(): Promise<void> {
    this.eventsStatus = 'loading';
    try {
      const events = await this.service.listEvents();
      runInAction(() => {
        this.events = events;
        this.eventsStatus = 'success';
        this.errorCode = null;
      });
    } catch {
      runInAction(() => {
        this.eventsStatus = 'error';
      });
    }
  }

  async verify(): Promise<void> {
    if (this.verificationStatus === 'loading') return;
    this.verificationStatus = 'loading';
    try {
      const result = await this.service.verifyIntegrity();
      runInAction(() => {
        this.integrity = result;
        this.verificationStatus = 'success';
        this.errorCode = null;
      });
    } catch {
      runInAction(() => {
        this.integrity = null;
        this.verificationStatus = 'error';
      });
    }
  }

  async decryptEvent(event: VaultEvent): Promise<string> {
    return this.crypto.decryptSnapshot(event);
  }

  lock(): void {
    this.crypto.lock();
    this.events = [];
    this.integrity = null;
    this.eventsStatus = 'idle';
    this.verificationStatus = 'idle';
    this.errorCode = null;
    this.recoveryPhrase = null;
    this.status = 'unknown';
  }

  private setError(error: unknown): void {
    runInAction(() => {
      this.status = 'error';
      this.errorCode = error instanceof Error ? error.message : 'VAULT_FAILED';
    });
  }
}
