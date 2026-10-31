# Бюджето — hackathon

Серверное приложение для учёта личных финансов с возможностью фонового AI-анализа.

## Архитектурная основа
- Web: React + TypeScript (подключим интерфейс существующего Budgetto отдельной задачей).
- API: NestJS, модульный монолит, CQRS (раздельные команды и запросы).
- PostgreSQL: финансовые данные, изоляция по пользователям.
- Асинхронные задачи: worker; очередь и Redis подключаются при появлении задач.
- Банки: адаптеры импорта (Excel/CSV) и официальных API, без хранения банковских паролей.
- AI: обработчик с минимальными разрешениями, без прямого неограниченного доступа к БД.

## Состояние
Это **начальный каркас**, не готовый продукт. Существующий проект [Budgetto](https://github.com/xom9kxom9k/Budgeto) — источник функциональности для переноса, не импортирован автоматически.

## Локальный запуск API
```bash
npm install
npm run migration:run
npm run dev:api
```
Проверка: `GET http://localhost:3000/api/health`.

## PostgreSQL (локально)
```bash
docker compose up -d postgres
npm run migration:run
```
API использует PostgreSQL без `synchronize`; схема создаётся только через миграции.

Entity-классы принадлежат своим модулям: auth-сущности находятся в
`apps/api/src/modules/auth/entities`, а `AccountEntity` — в
`apps/api/src/modules/accounts/entities`. Папка `database` содержит только
DataSource и миграции.

Подробности: [архитектура](docs/architecture.md), [безопасность](docs/security.md), [бэклог](docs/backlog.md).

Рабочий продуктовый план: [docs/plan.md](docs/plan.md).

Авторские права на проект: Фомичев Вячеслав Сергеевич. Правовой статус кода и лицензия уточняются перед открытой публикацией.
