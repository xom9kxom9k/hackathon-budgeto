# Разработка и проверки

Node.js 22. Из корня репозитория:

```bash
npm ci
npm run lint
npm run format:check
npm run typecheck
npm run build:api
```

После установки зависимостей `prepare` активирует Lefthook. Перед коммитом запускаются ESLint и проверка Prettier, для сообщения коммита — Commitlint.

Коммиты в формате Conventional Commits: `feat(accounts): add account query`, `fix(auth): reject expired session`, `chore(ci): add checks`.

Исправление форматирования: `npm run format`; исправление некоторых замечаний линтера: `npm run lint:fix`.

GitHub Actions запускает проверки при push в main и для pull request; отдельный workflow проверяет сообщения коммитов PR.

CI требует `package-lock.json`, который должен обновляться через `npm install` при изменении пакетов. Внешние секреты в PR-проверках не используются.
