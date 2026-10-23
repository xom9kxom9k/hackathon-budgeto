import { makeAutoObservable, runInAction } from 'mobx';

import type { ImportConfirmationClaims, VaultProof } from '@/shared/services/ImportService';
import type { TransactionClaim } from '@/shared/services/TransactionsService';
import type { VaultEvent, VaultIntegrity, VaultService } from '@/shared/services/VaultService';
import { VaultCrypto } from '@/shared/vault/VaultCrypto';

export type VaultStatus = 'unknown' | 'uninitialized' | 'locked' | 'unlocked' | 'error';

export class VaultStore {
  status: VaultStatus = 'unknown';
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

  async create(): Promise<string | null> {
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
    }
  }

  async unlock(recoveryPhrase: string): Promise<boolean> {
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
      this.setError(error);
      return false;
    }
  }

  async createProofs(claims: Array<ImportConfirmationClaims['claims'][number] | TransactionClaim>): Promise<VaultProof[]> {
    if (this.status !== 'unlocked') throw new Error('VAULT_KEY_REQUIRED');
    return Promise.all(claims.map((claim) => this.crypto.createProof(claim)));
  }

  async loadEvents(): Promise<void> {
    try {
      const events = await this.service.listEvents();
      runInAction(() => {
        this.events = events;
        this.errorCode = null;
      });
    } catch (error) {
      this.setError(error);
    }
  }

  async verify(): Promise<void> {
    try {
      const result = await this.service.verifyIntegrity();
      runInAction(() => {
        this.integrity = result;
        this.errorCode = null;
      });
    } catch (error) {
      this.setError(error);
    }
  }

  async decryptEvent(event: VaultEvent): Promise<string> {
    return this.crypto.decryptSnapshot(event);
  }

  lock(): void {
    this.crypto.lock();
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
