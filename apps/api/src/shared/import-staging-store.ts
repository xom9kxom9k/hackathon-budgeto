import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, lstat, mkdir, open, readdir, unlink } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { decryptImportStaging, encryptImportStaging } from './import-staging-crypto';
import { ImportError, ImportErrorCode } from './import-parser/import-errors';

const uploadName = /^[a-f0-9-]{36}\.upload$/;
const maxEnvelopeBytes = 8 * 1024 * 1024 + 128;

export class ImportStagingStore {
  readonly directory = resolve(
    process.env.IMPORT_STAGING_DIR ?? join(process.cwd(), '.data', 'imports'),
  );
  readonly ttlSeconds = Number(process.env.IMPORT_STAGING_TTL_SECONDS ?? 86400);

  constructor() {
    if (!Number.isInteger(this.ttlSeconds) || this.ttlSeconds < 60 || this.ttlSeconds > 604800) {
      throw new Error('IMPORT_STAGING_TTL_SECONDS must be between 60 and 604800');
    }
  }

  async prepare(): Promise<void> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const directory = await lstat(this.directory);
    if (!directory.isDirectory() || directory.isSymbolicLink()) {
      throw new Error('Import staging directory must be a real directory');
    }
    await chmod(this.directory, 0o700);
  }

  private path(filePath: string): string {
    const path = resolve(filePath);
    if (dirname(path) !== this.directory || !uploadName.test(basename(path))) {
      throw new ImportError(ImportErrorCode.IMPORT_STAGING_DECRYPT_FAILED);
    }
    return path;
  }

  async write(content: Buffer): Promise<string> {
    await this.prepare();
    const filePath = join(this.directory, `${randomUUID()}.upload`);
    const file = await open(filePath, 'wx', 0o600);
    try {
      await file.writeFile(encryptImportStaging(content));
    } catch (error) {
      await file.close();
      await this.remove(filePath);
      throw error;
    }
    await file.close();
    return filePath;
  }

  async read(filePath: string): Promise<Buffer> {
    await this.prepare();
    const path = this.path(filePath);
    const info = await lstat(path).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') throw new ImportError(ImportErrorCode.IMPORT_NOT_RETRYABLE);
      throw error;
    });
    if (!info.isFile() || info.isSymbolicLink()) {
      throw new ImportError(ImportErrorCode.IMPORT_STAGING_DECRYPT_FAILED);
    }
    const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > maxEnvelopeBytes) {
        throw new ImportError(ImportErrorCode.IMPORT_FILE_TOO_LARGE);
      }
      if (stat.mtimeMs + this.ttlSeconds * 1000 <= Date.now()) {
        throw new ImportError(ImportErrorCode.IMPORT_NOT_RETRYABLE);
      }
      return decryptImportStaging(await file.readFile());
    } finally {
      await file.close();
    }
  }

  async remove(filePath: string): Promise<void> {
    try {
      await this.prepare();
      await unlink(this.path(filePath));
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return;
      throw new ImportError(ImportErrorCode.IMPORT_STAGING_CLEANUP_FAILED, undefined, {
        cause: error,
      });
    }
  }

  async removeExpired(now = Date.now()): Promise<string[]> {
    await this.prepare();
    const removed: string[] = [];
    for (const name of await readdir(this.directory)) {
      if (!uploadName.test(name)) continue;
      const path = join(this.directory, name);
      try {
        const stat = await lstat(path);
        if (stat.isFile() && stat.mtimeMs + this.ttlSeconds * 1000 <= now) {
          await this.remove(path);
          removed.push(path);
        }
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
          continue;
        throw error;
      }
    }
    return removed;
  }
}
