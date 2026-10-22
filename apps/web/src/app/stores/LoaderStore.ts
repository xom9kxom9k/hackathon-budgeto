import { makeAutoObservable } from 'mobx';

export class LoaderStore {
  private readonly activeRequests = new Set<string>();

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  start(requestId: string): void {
    this.activeRequests.add(requestId);
  }

  finish(requestId: string): void {
    this.activeRequests.delete(requestId);
  }

  get isLoading(): boolean {
    return this.activeRequests.size > 0;
  }

  get activeRequestCount(): number {
    return this.activeRequests.size;
  }
}
