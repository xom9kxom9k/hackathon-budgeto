import { randomUUID } from 'node:crypto';
import { lstat, mkdtemp, readFile, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportStagingStore } from './import-staging-store';

describe('import staging storage', () => {
  let root: string;
  let store: ImportStagingStore;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'budgeto-staging-'));
    vi.stubEnv('IMPORT_STAGING_DIR', join(root, 'imports'));
    vi.stubEnv('IMPORT_STAGING_TTL_SECONDS', '60');
    vi.stubEnv('AUTH_ENCRYPTION_KEY', 'a'.repeat(64));
    vi.stubEnv('NODE_ENV', 'production');
    store = new ImportStagingStore();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  });

  it('writes encrypted private files readable by another store instance', async () => {
    const content = Buffer.from('private statement');
    const path = await store.write(content);
    expect(await readFile(path)).not.toEqual(content);
    expect(await new ImportStagingStore().read(path)).toEqual(content);
    if (process.platform !== 'win32') {
      expect((await lstat(store.directory)).mode & 0o777).toBe(0o700);
      expect((await lstat(path)).mode & 0o777).toBe(0o600);
    }
    await store.remove(path);
    await store.remove(path);
    await expect(readFile(path)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses reads and deletes outside the staging directory', async () => {
    const outside = join(root, `${randomUUID()}.upload`);
    await writeFile(outside, 'keep');
    await expect(store.read(outside)).rejects.toThrow('IMPORT_STAGING_DECRYPT_FAILED');
    await expect(store.remove(outside)).rejects.toThrow('IMPORT_STAGING_CLEANUP_FAILED');
    expect(await readFile(outside, 'utf8')).toBe('keep');
    await expect(store.read(join(store.directory, '..', 'secret'))).rejects.toThrow();
  });

  it.skipIf(process.platform === 'win32')(
    'refuses symlink reads and a symlink staging directory',
    async () => {
      await store.prepare();
      const outside = join(root, 'secret');
      await writeFile(outside, 'keep');
      const link = join(store.directory, `${randomUUID()}.upload`);
      await symlink(outside, link);
      await expect(store.read(link)).rejects.toThrow('IMPORT_STAGING_DECRYPT_FAILED');
      await rm(store.directory, { recursive: true });
      await symlink(root, store.directory);
      await expect(store.prepare()).rejects.toThrow('real directory');
      expect(await readFile(outside, 'utf8')).toBe('keep');
    },
  );

  it('expires abandoned uploads but preserves recent files and unrelated files', async () => {
    const expired = await store.write(Buffer.from('old'));
    const fresh = await store.write(Buffer.from('new'));
    const unrelated = join(store.directory, 'keep.txt');
    await writeFile(unrelated, 'keep');
    const old = new Date(Date.now() - 61_000);
    await utimes(expired, old, old);
    await utimes(unrelated, old, old);
    await expect(store.read(expired)).rejects.toThrow('IMPORT_NOT_RETRYABLE');
    expect(await store.removeExpired()).toEqual([expired]);
    expect(await store.read(fresh)).toEqual(Buffer.from('new'));
    expect(await readFile(unrelated, 'utf8')).toBe('keep');
    await expect(store.read(expired)).rejects.toThrow('IMPORT_NOT_RETRYABLE');
  });

  it('rejects unbounded retention', () => {
    vi.stubEnv('IMPORT_STAGING_TTL_SECONDS', '0');
    expect(() => new ImportStagingStore()).toThrow('between 60 and 604800');
  });
});
