import { randomUUID } from 'node:crypto';
import { Queue, QueueEvents, Worker } from 'bullmq';
import Redis from 'ioredis';
import { expect, it } from 'vitest';

const redisUrl = process.env.TEST_REDIS_URL;
if (!redisUrl) throw new Error('TEST_REDIS_URL is required for Redis integration tests');

it('processes a BullMQ job through real Redis', async () => {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const name = `budgeto-test-${randomUUID()}`;
  const queue = new Queue(name, { connection });
  const events = new QueueEvents(name, { connection });
  const worker = new Worker(name, async (job) => ({ sourceRow: job.data.sourceRow }), {
    connection,
  });
  try {
    expect(await connection.ping()).toBe('PONG');
    await events.waitUntilReady();
    await worker.waitUntilReady();
    const job = await queue.add('parse-import', { sourceRow: 2 });
    await expect(job.waitUntilFinished(events, 10_000)).resolves.toEqual({ sourceRow: 2 });
    expect(await job.getState()).toBe('completed');
  } finally {
    await worker.close(true);
    await events.close();
    await queue.obliterate({ force: true });
    await queue.close();
    await connection.quit();
  }
});
