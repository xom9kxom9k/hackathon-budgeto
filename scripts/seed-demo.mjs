import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { generate } from 'otplib';
import { VaultCrypto } from '../apps/web/src/shared/vault/VaultCrypto.ts';

const credentialsPath = new URL('../.data/demo/analytics.json', import.meta.url);
const base = new URL(process.env.DEMO_API_URL ?? 'http://127.0.0.1:3000/api/');
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) {
  throw new Error('Demo seeds may only target a local API.');
}
if (process.env.NODE_ENV === 'production')
  throw new Error('Demo seeds are disabled in production.');
let state;
try {
  state = JSON.parse(await readFile(credentialsPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (process.argv.includes('--code')) {
  if (!state?.totpSecret) throw new Error('Run npm run seed:demo first.');
  console.log(await generate({ secret: state.totpSecret }));
  process.exit(0);
}
state ??= {
  email: 'demo.analytics@budgeto.local',
  password: randomBytes(24).toString('base64url'),
};
async function persist() {
  await mkdir(new URL('.', credentialsPath), { recursive: true });
  await writeFile(credentialsPath, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
}
const cookies = new Map();
let csrf;
async function request(path, body, method = body === undefined ? 'GET' : 'POST') {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(new URL(path, base.href.endsWith('/') ? base : base.href + '/'), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(';')[0];
      const split = pair.indexOf('=');
      cookies.set(pair.slice(0, split), pair.slice(split + 1));
    }
    if (response.status === 429) {
      console.log('API rate limit reached; waiting for the next request window.');
      await new Promise((resolve) => setTimeout(resolve, 61_000));
      continue;
    }
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(payload)}`);
    return payload;
  }
  throw new Error(`Rate limit did not clear: ${path}`);
}
csrf = (await request('auth/csrf')).token;
if (!state.userId) {
  if (!state.challengeToken) {
    const setup = await request('auth/register', { email: state.email, password: state.password });
    state.challengeToken = setup.challengeToken;
    state.totpSecret = new URL(setup.otpauthUri).searchParams.get('secret');
    await persist();
  }
  const result = await request('auth/register/totp', {
    challengeToken: state.challengeToken,
    code: await generate({ secret: state.totpSecret }),
  });
  state.userId = result.user.id;
  state.recoveryCodes = result.recoveryCodes;
  state.lastTotpStep = Math.floor(Date.now() / 30_000);
  delete state.challengeToken;
  await persist();
} else {
  while (Math.floor(Date.now() / 30_000) <= (state.lastTotpStep ?? 0)) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const challenge = await request('auth/login', { email: state.email, password: state.password });
  await request('auth/login/totp', {
    challengeToken: challenge.challengeToken,
    code: await generate({ secret: state.totpSecret }),
  });
  state.lastTotpStep = Math.floor(Date.now() / 30_000);
  await persist();
}
await request('auth/onboarding', {
  displayName: 'Демо · вымышленные данные',
  goals: ['accounts', 'transactions', 'imports'],
});
const vault = new VaultCrypto();
const bundle = await request('vault/key');
if (bundle) {
  if (!state.recoveryPhrase)
    throw new Error('The demo key exists but its local recovery phrase is missing.');
  await vault.unlock(bundle, state.recoveryPhrase);
} else {
  const created = await vault.createBundle();
  state.recoveryPhrase = created.recoveryPhrase;
  await persist();
  await request('vault/key/public', {
    publicKey: created.publicKey,
    encryptedPrivateKey: created.encryptedPrivateKey,
    keyVersion: created.keyVersion,
  });
}
async function references(path, inputs) {
  const existing = await request(path);
  const result = {};
  for (const input of inputs) {
    const item =
      existing.find((value) => value.name === input.name) ?? (await request(path, input));
    result[input.name] = item.id;
  }
  return result;
}
const accounts = await references('accounts', [
  { name: 'Демо · основной', currency: 'RUB' },
  { name: 'Демо · накопления', currency: 'RUB' },
  { name: 'Демо · валютный', currency: 'USD' },
]);
const categories = await references('categories', [
  ...['Продукты', 'Жильё', 'Транспорт', 'Кафе', 'Здоровье', 'Покупки'].map((name) => ({
    name,
    kind: 'expense',
  })),
  ...['Зарплата', 'Подработка'].map((name) => ({ name, kind: 'income' })),
]);
const now = new Date();
const rows = [];
const expenseCategories = ['Продукты', 'Транспорт', 'Кафе', 'Здоровье', 'Покупки'];
for (let offset = -2; offset <= 0; offset++) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const days =
    offset === 0
      ? now.getUTCDate()
      : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  for (let day = 1; day <= days; day++) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), day))
      .toISOString()
      .slice(0, 10);
    const add = (
      kind,
      amount,
      category,
      note,
      accountId = accounts['Демо · основной'],
      destinationAccountId = null,
    ) =>
      rows.push({
        date,
        kind,
        amount,
        accountId,
        destinationAccountId,
        categoryId: category ? categories[category] : null,
        note: `ДЕМО: ${note}`,
      });
    if (day === 1 || day === 15) add('income', day === 1 ? 62000 : 58000, 'Зарплата', 'зарплата');
    if (day === 22) add('income', 12500 + (offset + 2) * 1500, 'Подработка', 'проектная работа');
    if (day === 3) add('expense', 28500, 'Жильё', 'аренда и коммунальные услуги');
    if (day % 7 === 0)
      add(
        'transfer',
        7000,
        null,
        'перевод в накопления',
        accounts['Демо · основной'],
        accounts['Демо · накопления'],
      );
    const category = expenseCategories[(day + offset + 7) % expenseCategories.length];
    const amounts = { Продукты: 1450, Транспорт: 240, Кафе: 690, Здоровье: 1250, Покупки: 2100 };
    add(
      'expense',
      amounts[category] + ((day * 137) % 600),
      category,
      category.toLocaleLowerCase('ru'),
    );
    if (day === 10) add('expense', 49.9, 'Покупки', 'покупка в USD', accounts['Демо · валютный']);
  }
}
let saved = 0;
for (const row of rows) {
  const hash = createHash('sha256').update(JSON.stringify(row)).digest('hex');
  const operationId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  const input = { ...row, operationId };
  const claim = await request('transactions/claims', input);
  const proof = await vault.createProof(claim);
  await request('transactions', { ...input, proof });
  if (++saved % 10 === 0) console.log(`Demo transactions processed: ${saved}/${rows.length}`);
}
if (!(await request('savings-goals/RUB'))) {
  await request(
    'savings-goals/RUB',
    { name: 'Подушка безопасности', target: 180000, saved: 35000 },
    'PUT',
  );
}
const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
state.previewFrom = previous.toISOString().slice(0, 10);
state.previewTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  .toISOString()
  .slice(0, 10);
await persist();
const integrity = await request('vault/integrity');
if (!integrity.valid) throw new Error('The seeded journal failed integrity verification.');
const summary = await request(
  `overview?from=${state.previewFrom}&to=${state.previewTo}&currency=RUB`,
);
for (const kind of ['income', 'expenses']) {
  const total = summary.cashflow.reduce((sum, point) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(point.period))
      throw new Error('Cashflow must use calendar dates.');
    return sum + Math.round(point[kind] * 100);
  }, 0);
  if (total !== Math.round(summary.totals[kind] * 100))
    throw new Error(`Cashflow ${kind} does not match totals.`);
}
const transactions = await request('transactions?page=1&pageSize=1');
if (transactions.total !== rows.length)
  throw new Error(`Expected ${rows.length} demo transactions, found ${transactions.total}.`);
console.log(
  `Analytics reconciled: income ${summary.totals.income}, expenses ${summary.totals.expenses}, net ${summary.totals.net} RUB; no duplicate transactions.`,
);
console.log(
  `Created synthetic demo data through the signed API: ${rows.length} transactions; journal verified.`,
);
console.log(`Credentials: ${fileURLToPath(credentialsPath)}`);
console.log(`Demo email: ${state.email}. Generate a login code with npm run demo:code.`);
console.log(`Overview period: ${state.previewFrom} .. ${state.previewTo}`);
