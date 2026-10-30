const assert = require('node:assert/strict');
const { createHash, randomBytes, randomUUID } = require('node:crypto');
const { lstat, readFile, utimes } = require('node:fs/promises');
const { Client } = require('pg');
const { ImportStagingStore } = require(`${process.cwd()}/dist/apps/api/shared/import-staging-store`);

const csv = 'date,amount,account,note\n2026-02-01,-12.50,Card,STAGING-SMOKE-PRIVATE\n';
const client = new Client({ connectionString: process.env.DATABASE_URL });
const store = new ImportStagingStore();
const base = 'http://127.0.0.1:3000/api';

async function session(userId) {
  const token = randomBytes(32).toString('hex');
  await client.query(
    "INSERT INTO sessions(user_id, token_hash, expires_at, last_seen_at) VALUES ($1, $2, now() + interval '1 hour', now())",
    [userId, createHash('sha256').update(token).digest('hex')],
  );
  const response = await fetch(`${base}/auth/csrf`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /Secure/i);
  const { token: csrf } = await response.json();
  return {
    cookie: `budgeto_session=${token}; budgeto_csrf=${csrf}`,
    'x-csrf-token': csrf,
  };
}

async function seed() {
  const userId = randomUUID();
  await client.query('INSERT INTO users(id, email, password_hash) VALUES ($1, $2, $3)', [
    userId,
    'deployment-smoke@example.test',
    'not-a-login-password',
  ]);
  await client.query('INSERT INTO accounts(user_id, name, currency) VALUES ($1, $2, $3)', [
    userId,
    'Card',
    'RUB',
  ]);
  const headers = await session(userId);
  const form = new FormData();
  form.set('file', new Blob([csv], { type: 'text/csv' }), 'statement.csv');
  const response = await fetch(`${base}/imports`, { method: 'POST', headers, body: form });
  assert.equal(response.status, 201, await response.clone().text());
  const view = await response.json();
  assert.equal(view.status, 'queued');
  assert.equal(view.filePath, undefined);
  const {
    rows: [job],
  } = await client.query('SELECT * FROM import_jobs WHERE id = $1', [view.id]);
  assert.match(job.file_path, /^\/app\/\.data\/imports\/[a-f0-9-]{36}\.upload$/);
  const envelope = await readFile(job.file_path);
  assert.equal(envelope.includes(Buffer.from('STAGING-SMOKE-PRIVATE')), false);
  assert.equal((await lstat(job.file_path)).mode & 0o777, 0o600);
  assert.equal((await lstat(store.directory)).mode & 0o777, 0o700);
  assert.equal(process.getuid(), 1000);
  assert.equal((await store.read(job.file_path)).toString(), csv);

  const outsider = randomUUID();
  await client.query('INSERT INTO users(id, email, password_hash) VALUES ($1, $2, $3)', [
    outsider,
    'outsider@example.test',
    'not-a-login-password',
  ]);
  const outsideHeaders = await session(outsider);
  for (const [method, path] of [
    ['GET', ''],
    ['DELETE', '/staging'],
  ]) {
    const denied = await fetch(`${base}/imports/${job.id}${path}`, {
      method,
      headers: outsideHeaders,
    });
    assert.equal(denied.status, 404);
  }
  assert.equal((await store.read(job.file_path)).toString(), csv);

  const expiredPath = await store.write(Buffer.from('expired statement'));
  const old = new Date(Date.now() - (store.ttlSeconds + 1) * 1000);
  await utimes(expiredPath, old, old);
  await client.query(
    "INSERT INTO import_jobs(user_id, file_name, file_path, status, error_code) VALUES ($1, 'expired.csv', $2, 'failed', 'IMPORT_PARSE_FAILED')",
    [userId, expiredPath],
  );
  console.log('Encrypted upload, Linux permissions, ownership checks and queued job verified');
}

async function verify() {
  const {
    rows: [user],
  } = await client.query("SELECT id FROM users WHERE email = 'deployment-smoke@example.test'");
  let job;
  for (let attempt = 0; attempt < 60; attempt++) {
    ({
      rows: [job],
    } = await client.query(
      "SELECT * FROM import_jobs WHERE user_id = $1 AND file_name = 'statement.csv'",
      [user.id],
    ));
    if (job.status === 'preview' || job.status === 'failed') break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.equal(job.status, 'preview', job.error_code);
  assert.equal(job.preview.total, 1);
  assert.equal(job.preview.rows[0].amount, 12.5);
  assert.equal((await store.read(job.file_path)).toString(), csv);
  const headers = await session(user.id);
  const {
    rows: [expired],
  } = await client.query(
    "SELECT * FROM import_jobs WHERE user_id = $1 AND file_name = 'expired.csv'",
    [user.id],
  );
  await assert.rejects(readFile(expired.file_path), { code: 'ENOENT' });
  const retry = await fetch(`${base}/imports/${expired.id}/retry`, { method: 'POST', headers });
  assert.equal(retry.status, 400);
  assert.match(await retry.text(), /IMPORT_NOT_RETRYABLE/);

  await client.query("UPDATE import_jobs SET status = 'failed' WHERE id = $1", [job.id]);
  const deleted = await fetch(`${base}/imports/${job.id}/staging`, { method: 'DELETE', headers });
  assert.equal(deleted.status, 200);
  await assert.rejects(readFile(job.file_path), { code: 'ENOENT' });
  const {
    rows: [cleaned],
  } = await client.query('SELECT file_path FROM import_jobs WHERE id = $1', [job.id]);
  assert.equal(cleaned.file_path, '');
  console.log(
    'Queue and encrypted volume survived recreation; worker parsed upload; expiry and authenticated deletion verified',
  );
}

(async () => {
  await client.connect();
  try {
    if (process.argv[2] === 'seed') await seed();
    else if (process.argv[2] === 'verify') await verify();
    else throw new Error('Use seed or verify in a disposable deployment test stack');
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
