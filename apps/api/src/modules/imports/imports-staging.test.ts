import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportsService } from './imports.service';
import { ImportJobEntity, ImportJobStatus } from './entities/import-job.entity';

const queue = vi.hoisted(() => ({ add: vi.fn() }));
vi.mock('./imports.queue', () => ({ createImportQueue: () => queue }));

describe('ImportsService staging rollback', () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'budgeto-upload-'));
    vi.stubEnv('IMPORT_STAGING_DIR', directory);
    vi.stubEnv('AUTH_ENCRYPTION_KEY', 'a'.repeat(64));
    queue.add.mockReset();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  });

  function setup() {
    const jobs = {
      create: vi.fn((value) => ({ ...value, id: 'job-1' })),
      save: vi.fn(async (value) => value),
      remove: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
    };
    const service = new ImportsService(
      jobs as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, jobs };
  }

  it('removes both encrypted file and job when enqueueing fails', async () => {
    const { service, jobs } = setup();
    queue.add.mockRejectedValue(new Error('Redis unavailable'));
    await expect(
      service.create('user-1', 'statement.csv', Buffer.from('date,amount\n')),
    ).rejects.toThrow('Redis unavailable');
    expect(await readdir(directory)).toEqual([]);
    expect(jobs.remove).toHaveBeenCalledOnce();
  });

  it('removes the file when saving the job fails', async () => {
    const { service, jobs } = setup();
    jobs.save.mockRejectedValue(new Error('Database unavailable'));
    await expect(
      service.create('user-1', 'statement.csv', Buffer.from('date,amount\n')),
    ).rejects.toThrow('Database unavailable');
    expect(await readdir(directory)).toEqual([]);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('never exposes a filesystem path in the upload response', async () => {
    const { service, jobs } = setup();
    const result = await service.create(
      'user-1',
      '../../statement.csv',
      Buffer.from('date,amount\n'),
    );
    expect(result).not.toHaveProperty('filePath');
    const job = jobs.save.mock.calls[0][0] as ImportJobEntity;
    expect(job.filePath.startsWith(directory)).toBe(true);
    expect((await readFile(job.filePath)).toString()).not.toContain('date,amount');
    jobs.findOne.mockImplementation(async ({ where }) =>
      where.userId === 'user-1' ? { ...job, status: ImportJobStatus.Failed } : null,
    );
    await expect(service.deleteStaging('user-2', job.id)).rejects.toThrow('IMPORT_NOT_FOUND');
    expect(await readFile(job.filePath)).toBeInstanceOf(Buffer);
    await service.deleteStaging('user-1', job.id);
    expect(await readdir(directory)).toEqual([]);
    expect(jobs.update).toHaveBeenCalledWith(job.id, { filePath: '' });
  });
});
