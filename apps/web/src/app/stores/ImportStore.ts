import { makeAutoObservable } from 'mobx';

import type { RequestStatus } from '@/shared/types/request';

export interface ImportPreview {
  fileName: string;
  fileSize: number;
  extension: string;
}

export class ImportStore {
  status: RequestStatus = 'idle';
  selectedFile: File | null = null;
  preview: ImportPreview | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  selectFile(file: File): void {
    this.selectedFile = file;
    this.preview = null;
    this.status = 'success';
  }

  setPreview(preview: ImportPreview): void {
    this.preview = preview;
    this.status = 'success';
  }

  clear(): void {
    this.selectedFile = null;
    this.preview = null;
    this.status = 'idle';
  }
}
