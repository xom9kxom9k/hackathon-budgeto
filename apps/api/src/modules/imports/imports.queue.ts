import { Queue } from 'bullmq';

export const IMPORT_QUEUE = 'budgeto-imports';

export function createImportQueue(): Queue {
  return new Queue(IMPORT_QUEUE, {
    connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
  });
}
