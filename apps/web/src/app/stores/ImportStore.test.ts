import { ImportStore } from './ImportStore';
import type { ImportJob, ImportService } from '@/shared/services/ImportService';

const previewJob = (status: ImportJob['status'] = 'preview'): ImportJob => ({
  id: 'job-1',
  fileName: 'statement.xlsx',
  status,
  errorCode: null,
  preview: {
    format: 'budgeto-xlsx',
    parserId: 'xlsx-header-map',
    parserVersion: '1.0.0',
    templateId: 'generic-xlsx-table',
    confidence: 0.98,
    total: 1,
    valid: 1,
    invalid: 0,
    rows: [],
  },
});

describe('ImportStore', () => {
  it('restores a preview job without requiring the source file', async () => {
    const service = {
      getJob: vi.fn().mockResolvedValue(previewJob()),
    } as unknown as ImportService;
    const store = new ImportStore(service);

    await store.restoreJob('job-1');

    expect(service.getJob).toHaveBeenCalledWith('job-1');
    expect(store.job?.id).toBe('job-1');
    expect(store.status).toBe('success');
  });

  it('keeps the confirm result and marks the job confirmed', async () => {
    const service = {
      confirm: vi.fn().mockResolvedValue({ created: 3, skipped: 1 }),
      getJob: vi.fn().mockResolvedValue(previewJob('confirmed')),
    } as unknown as ImportService;
    const store = new ImportStore(service);
    store.job = previewJob();

    await store.confirm();

    expect(store.result).toEqual({ created: 3, skipped: 1 });
    expect(store.job?.status).toBe('confirmed');
    expect(store.status).toBe('success');
  });

  it('can clear only the local file selection while keeping the preview job', () => {
    const service = {} as ImportService;
    const store = new ImportStore(service);
    store.job = previewJob();
    store.selectFile(new File(['xlsx'], 'statement.xlsx'));
    store.job = previewJob();

    store.clearSelectedFile();

    expect(store.selectedFile).toBeNull();
    expect(store.job?.id).toBe('job-1');
  });
});
