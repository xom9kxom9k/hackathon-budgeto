# Разработка и проверки

Node.js 22. Из корня репозитория:

```bash
npm ci
npm run lint
npm run format:check
npm run typecheck
npm run build:api
```

PostgreSQL integration tests use an isolated temporary schema and remove it when
the run finishes. Point `TEST_DATABASE_URL` at a dedicated database whose name
contains `test`, then run:

```bash
TEST_DATABASE_URL=postgresql://budgeto:budgeto_dev@localhost:5432/budgeto_test TEST_REDIS_URL=redis://localhost:6379 npm run test:api:integration
```

On PowerShell, set the variable with
`$env:TEST_DATABASE_URL='postgresql://budgeto:budgeto_dev@localhost:5432/budgeto_test'`
and `$env:TEST_REDIS_URL='redis://localhost:6379'` before running the npm script. These tests cover the full migration chain,
legacy Vault event migration and verification, duplicate fingerprints, and
concurrent import confirmation. The regular `npm run test:api` suite excludes
the integration tests. Redis coverage processes a BullMQ job through a real
worker and removes its uniquely named queue after the test. Use a dedicated
test Redis instance.

`npm install` устанавливает Lefthook через `prepare`. На pre-commit запускаются ESLint и Prettier check, на commit-msg — Commitlint.

Conventional Commits: `feat(accounts): add query`, `fix(auth): reject expired session`, `chore(ci): update workflows`.

Исправление форматирования: `npm run format`; автоисправления ESLint: `npm run lint:fix`.

Workflow `Quality` проверяет каждый pull request и push в `dev`, `main`, `master`.
Его также можно запустить вручную. Job `Quality gate` использует Node.js 22,
PostgreSQL 16 и Redis 7, устанавливает зависимости через `npm ci`, запускает
lint, Prettier, проверку типов API и web, unit-тесты API и web, интеграционные
тесты PostgreSQL и Redis, сборки API, worker и web. Проверка типов worker
входит в его сборку. Production deploy зависит от успешного quality gate.
Отдельный job `Deployment smoke test` собирает production-образы и проверяет
Compose с одноразовыми PostgreSQL/Redis, API, worker и Caddy. Команда для Linux
с Docker: `bash scripts/smoke-deployment.sh`. Скрипт занимает 80/443 и удаляет
собственные тестовые тома после завершения. Подробности в [deployment.md](deployment.md).

Lockfile хранится в репозитории; Actions кэширует npm по нему. `.gitattributes`
фиксирует LF, чтобы Prettier одинаково проверял checkout на Windows и Linux.
Успешный запуск Actions нужно подтверждать по результату конкретного commit.

The integration command fails when TEST_DATABASE_URL is missing. It verifies all migration rollbacks, PostgreSQL lock waits, the unique fingerprint constraint and insert-conflict counters. The conflict test simulates a stale precheck; the insert and constraint remain real PostgreSQL operations.
