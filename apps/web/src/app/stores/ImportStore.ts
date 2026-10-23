import { makeAutoObservable, runInAction } from 'mobx';
import type { RequestStatus } from '@/shared/types/request';
import type { ImportJob, ImportRow, ImportService } from '@/shared/services/ImportService';

export class ImportStore {
  status: RequestStatus = 'idle';
  selectedFile: File | null = null;
  job: ImportJob | null = null;
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
    this.status = 'idle';
    this.errorCode = null;
  }
  async createJob(): Promise<void> {
    if (!this.selectedFile) return;
    this.status = 'loading';
    this.errorCode = null;
    try {
      const job = await this.service.create(this.selectedFile);
      runInAction(() => {
        this.job = job;
      });
      await this.poll(job.id);
    } catch (error) {
      runInAction(() => {
        this.status = 'error';
        this.errorCode = error instanceof Error ? error.message : 'IMPORT_FAILED';
      });
    }
  }
  async poll(jobId = this.job?.id): Promise<void> {
    if (!jobId) return;
    this.status = 'loading';
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const job = await this.service.getJob(jobId);
      runInAction(() => {
        this.job = job;
      });
      if (job.status === 'preview') {
        this.status = job.preview?.total ? 'success' : 'empty';
        return;
      }
      if (job.status === 'failed') {
        this.status = 'error';
        this.errorCode = job.errorCode;
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
    this.job = await this.service.updateRows(this.job.id, rows);
    this.status = 'success';
  }
  async confirm(): Promise<void> {
    if (!this.job) return;
    this.status = 'loading';
    await this.service.confirm(this.job.id);
    this.job = await this.service.getJob(this.job.id);
    this.status = 'success';
  }
  clear(): void {
    this.selectedFile = null;
    this.job = null;
    this.status = 'idle';
    this.errorCode = null;
  }
}
