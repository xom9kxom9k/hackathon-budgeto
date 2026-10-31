# Архитектура Budgetto

**Статус:** реализованный MVP-контур на ветке `dev`; production readiness ещё не подтверждена.

## Фактическая схема

`web -> NestJS HTTP API -> CQRS handlers -> TypeORM repositories -> PostgreSQL`

`import upload -> import job -> BullMQ/worker -> XLSX preview -> confirmation -> transactions + Vault events`

Клиент React/TypeScript считается недоверенным: он отображает данные и отправляет команды, а авторизация, валидация и user scoping выполняются API.

API является модульным монолитом. В коде есть модули auth, accounts, categories, transactions, imports, overview, vault и security/profile endpoints. PostgreSQL используется через TypeORM; миграции выполняются отдельно и `synchronize` отключён.

## Безопасность и границы данных

- Сессия хранится в httpOnly cookie, TOTP и recovery codes обрабатываются на API.
- CSRF проверяется глобальным guard для `POST`, `PUT`, `PATCH` и `DELETE`; `GET`, `HEAD`, `OPTIONS` и `/api/auth/csrf` исключены. Клиент получает cookie-токен и передаёт его в `X-CSRF-Token`, а после `AUTH_CSRF_INVALID` один раз обновляет токен и повторяет запрос.
- Все domain handlers получают `userId` из AuthGuard и ограничивают accounts, categories, transactions, imports, profile, sessions и Vault этим пользователем.
- ValidationPipe использует `transform`, `whitelist` и `forbidNonWhitelisted`.

## Импорт

Поддержан текущий XLSX pipeline: upload, staging file, worker parsing, preview, редактирование строк, retry и confirmation. В import job хранятся counters `created` и `skipped`. Подтверждение блокирует job строкой `FOR UPDATE`, поэтому повторное и конкурентное подтверждение возвращает один детерминированный результат. Fingerprint транзакции имеет уникальное ограничение, а конфликт вставки обрабатывается как skipped.

CSV, ML-классификация формата, банковские коннекторы и полноценное сопоставление колонок остаются будущими возможностями.

## Vault и история

Vault хранит зашифрованные snapshots в append-only `vault_events` и поддерживает hash-chain с chain head. События разделены на `transaction_confirmed`, `transaction_updated` и `transaction_reversed`. `operation_id` обеспечивает идемпотентность повторной команды, а update/reversal блокируют transaction row внутри бизнес-транзакции.

События schema version 1 совместимы с проверкой integrity; новые события schema version 2 включают operation ID, IV, auth tag и key version в event hash. Proof подписывает claim digest и параметры шифрования. Полный diff/rollback, Merkle anchor и blockchain anchor пока не реализованы.

## Web flows

Web-клиент использует typed services и MobX stores для auth, overview, references, transactions, imports, Vault, profile и security. Профиль редактируется на защищённом `/profile/edit`, который сохраняет данные через `PATCH /profile` и `PATCH /profile/preferences`, блокирует повторную отправку и возвращает пользователя на `/profile`.

## Worker и эксплуатация

Worker запускает импортные задачи через Redis/BullMQ. Миграции, API, worker и web собираются отдельными командами. Claims о CI или production deployment считаются неподтверждёнными, пока соответствующие команды и окружение фактически не запущены.

## Будущие границы

- Time Machine, diff и полноценный rollback/version history.
- CSV, ML и банковские коннекторы.
- S3/MinIO для долгоживущего хранения исходных файлов.
- AI read-only projections и Automatic Containment.
- Blockchain anchor только хэша версии без персональных данных.
- Tauri после стабильного web MVP.
