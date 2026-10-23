import { makeAutoObservable, runInAction } from 'mobx';
import type { RequestStatus } from '@/shared/types/request';
import type {
  ImportJob,
  ImportResult,
  ImportRow,
  ImportService,
} from '@/shared/services/ImportService';

export class ImportStore {
  status: RequestStatus = 'idle';
  selectedFile: File | null = null;
  job: ImportJob | null = null;
  result: ImportResult | null = null;
  errorCode: string | null = null;
  constructor(private readonly service: ImportService) {
    makeAutoObservable(this, {}, { autoBind: true });
  }
  get preview() {
    return this.job?.preview ?? null;
  }
  selectFile(file: File): void {
    this.selectedFile = file;
    this.job = null;
    this.result = null;
    this.status = 'idle';
    this.errorCode = null;
  }
  async createJob(): Promise<ImportJob | null> {
    if (!this.selectedFile) return null;
    this.status = 'loading';
    this.errorCode = null;
    this.result = null;
    try {
      const job = await this.service.create(this.selectedFile);
      runInAction(() => {
        this.job = job;
      });
      await this.poll(job.id);
      return job;
    } catch (error) {
      this.setError(error);
      return null;
    }
  }
  async restoreJob(jobId: string): Promise<void> {
    if (this.job?.id === jobId && this.status !== 'error') return;
    this.status = 'loading';
    this.errorCode = null;
    try {
      const job = await this.service.getJob(jobId);
      runInAction(() => {
        this.job = job;
      });
      if (job.status === 'queued' || job.status === 'parsing') await this.poll(job.id);
      else this.applyJobStatus(job);
    } catch (error) {
      this.setError(error);
    }
  }
  async poll(jobId = this.job?.id): Promise<void> {
    if (!jobId) return;
    this.status = 'loading';
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        const job = await this.service.getJob(jobId);
        runInAction(() => {
          this.job = job;
        });
        if (job.status !== 'queued' && job.status !== 'parsing') {
          this.applyJobStatus(job);
          return;
        }
      } catch (error) {
        this.setError(error);
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
    this.status = 'error';
    this.errorCode = 'IMPORT_TIMEOUT';
  }
  async updateRows(rows: ImportRow[]): Promise<void> {
    if (!this.job) return;
    this.status = 'loading';
    this.errorCode = null;
    try {
      this.job = await this.service.updateRows(this.job.id, rows);
      this.applyJobStatus(this.job);
    } catch (error) {
      this.setError(error);
    }
  }
  async confirm(): Promise<void> {
    if (!this.job) return;
    this.status = 'loading';
    this.errorCode = null;
    try {
      this.result = await this.service.confirm(this.job.id);
      this.job = await this.service.getJob(this.job.id);
      this.applyJobStatus(this.job);
    } catch (error) {
      this.setError(error);
    }
  }
  async retry(): Promise<void> {
    if (!this.job || this.job.status === 'failed' || this.job.status === 'confirmed') return;
    await this.restoreJob(this.job.id);
  }
  clear(): void {
    this.selectedFile = null;
    this.job = null;
    this.result = null;
    this.status = 'idle';
    this.errorCode = null;
  }
  private applyJobStatus(job: ImportJob): void {
    if (job.status === 'preview') {
      this.status = job.preview?.total ? 'success' : 'empty';
      return;
    }
    if (job.status === 'failed') {
      this.status = 'error';
      this.errorCode = job.errorCode;
      return;
    }
    this.status = 'success';
  }
  private setError(error: unknown): void {
    runInAction(() => {
      this.status = 'error';
      this.errorCode = error instanceof Error ? error.message : 'IMPORT_FAILED';
    });
  }
}
