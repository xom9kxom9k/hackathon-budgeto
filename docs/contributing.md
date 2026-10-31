# Разработка и проверки

Node.js 22. Из корня репозитория:

```bash
npm install
npm run lint
npm run format:check
npm run typecheck
npm run build:api
```

PostgreSQL integration tests use an isolated temporary schema and remove it when
the run finishes. Point `TEST_DATABASE_URL` at a dedicated database whose name
contains `test`, then run:

```bash
TEST_DATABASE_URL=postgresql://budgetto:budgetto_dev@localhost:5432/budgetto_test npm run test:api:integration
```

On PowerShell, set the variable with
`$env:TEST_DATABASE_URL='postgresql://budgetto:budgetto_dev@localhost:5432/budgetto_test'`
before running the npm script. These tests cover the full migration chain,
legacy Vault event migration and verification, duplicate fingerprints, and
concurrent import confirmation. The regular `npm run test:api` suite excludes
the PostgreSQL integration tests.

`npm install` устанавливает Lefthook через `prepare`. На pre-commit запускаются ESLint и Prettier check, на commit-msg — Commitlint.

Conventional Commits: `feat(accounts): add query`, `fix(auth): reject expired session`, `chore(ci): update workflows`.

Исправление форматирования: `npm run format`; автоисправления ESLint: `npm run lint:fix`.

GitHub Actions проверяет pull request и push в main; отдельный workflow проверяет commit messages.

**Ограничение:** lockfile ещё не сгенерирован: окружение выполнения не смогло обратиться к npm registry. В CI временно выполняется `npm install` вместо `npm ci`. При следующем доступном npm install закоммитить `package-lock.json`, после чего заменить установку в CI на `npm ci` и включить кэширование. Нельзя считать проверки зелёными до фактического запуска Actions.

The integration command fails when TEST_DATABASE_URL is missing. It verifies all migration rollbacks, PostgreSQL lock waits, the unique fingerprint constraint and insert-conflict counters. The conflict test simulates a stale precheck; the insert and constraint remain real PostgreSQL operations.
