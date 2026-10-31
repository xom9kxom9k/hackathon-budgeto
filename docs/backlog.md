# Backlog Budgeto

## Готово в текущем MVP-контуре

1. PostgreSQL schema и TypeORM migrations для users, sessions, accounts, categories, transactions, imports и Vault.
2. Auth с password/TOTP/recovery flow, session cookies и user scoping.
3. Глобальная CSRF-защита mutation endpoints и одноразовое обновление токена на web-клиенте.
4. CQRS handlers для accounts, categories, transactions, imports, overview, profile и security.
5. XLSX upload, worker parsing, preview, редактирование строк, retry и confirmation.
6. Идемпотентное конкурентно-безопасное подтверждение import job с counters created/skipped.
7. Append-only Vault events, schema-version compatibility, proof validation, hash-chain и operation-based idempotency.
8. Web flows для references, transactions, imports, Vault, profile, `/profile/edit` и security center.
9. Strict TypeScript gate для API, worker и web; lint и API unit tests должны запускаться локально.
10. PostgreSQL integration tests для полной цепочки migrations и rollback, concurrent confirmation, duplicate fingerprints и Vault legacy events.
11. CI quality gate с Node.js 22, PostgreSQL 16 и Redis 7: lint, форматирование, типы, unit/integration tests и все сборки. Проверено [запуском Actions](https://github.com/xom9kxom9k/hackathon-budgeto/actions/runs/41109172082); production deploy зависит от этого gate.

## P1: следующий рабочий срез

- Добавить web tests для Profile Edit, повторной отправки и CSRF refresh после истёкшего токена.
- Проверить deployment configuration и безопасное хранение import staging files.

## P2: продуктовые расширения

- CSV и дополнительные XLSX adapters с mapping колонок.
- Единая canonical schema с currency, merchant и external ID.
- ML-классификация формата с confidence и ручным mapping.
- Time Machine, diff и полноценный rollback/version history.
- S3/MinIO для snapshots и исходных файлов.
- Security Center для access grants и export controls.

## P3: демонстрационные направления

- AI read-only projections без передачи лишних полей.
- Blockchain anchor только хэша версии.
- Tauri-клиент после стабилизации web MVP.

Нереализованные возможности не следует описывать как production-ready.
