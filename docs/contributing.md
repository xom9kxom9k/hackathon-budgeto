# Разработка и проверки

Node.js 22. Из корня репозитория:

```bash
npm install
npm run lint
npm run format:check
npm run typecheck
npm run build:api
```

`npm install` устанавливает Lefthook через `prepare`. На pre-commit запускаются ESLint и Prettier check, на commit-msg — Commitlint.

Conventional Commits: `feat(accounts): add query`, `fix(auth): reject expired session`, `chore(ci): update workflows`.

Исправление форматирования: `npm run format`; автоисправления ESLint: `npm run lint:fix`.

GitHub Actions проверяет pull request и push в main; отдельный workflow проверяет commit messages.

**Ограничение:** lockfile ещё не сгенерирован: окружение выполнения не смогло обратиться к npm registry. В CI временно выполняется `npm install` вместо `npm ci`. При следующем доступном npm install закоммитить `package-lock.json`, после чего заменить установку в CI на `npm ci` и включить кэширование. Нельзя считать проверки зелёными до фактического запуска Actions.
