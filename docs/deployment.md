# Деплой Budgeto

## Локальная разработка

```bash
cp infra/dev/.env.example infra/dev/.env
docker compose -f infra/dev/compose.yml up --build
```

Web: `http://localhost:5173`, API: `http://localhost:3000/api/health`.
Остановка: `docker compose -f infra/dev/compose.yml down`.

## Production

Нужны Linux, Docker Engine и Docker Compose v2 с поддержкой `up --wait`.
Откройте только 80/443 и SSH; DNS домена должен указывать на сервер.
PostgreSQL и Redis не публикуют порты и находятся во внутренней сети.
Caddy подключён только к edge-сети, API связывает её с backend-сетью.

Создайте пользователя деплоя и каталог проекта:

```bash
sudo useradd --create-home --shell /bin/bash deploy
sudo usermod --append --groups docker deploy
sudo install --directory --owner deploy --group deploy /opt/budgeto
```

Доступ к Docker даёт пользователю контроль над сервером. Не используйте
этого пользователя для других приложений. Разместите исходники проекта в
`/opt/budgeto`, скопируйте `infra/prod/.env.example` в `/opt/budgeto/.env`.

Заполните значения:

- `POSTGRES_PASSWORD`: случайный пароль; для URL удобно использовать hex
  (`openssl rand -hex 24`). `DATABASE_URL` должен содержать тот же пароль,
  пользователя и БД, host `postgres`. Спецсимволы пароля в URL кодируйте.
- `AUTH_ENCRYPTION_KEY`: результат `openssl rand -hex 32`. API и worker
  получают одинаковый ключ. Production отвергает короткие ключи и значения
  `replace-with...`. Ключ нельзя терять: он защищает TOTP и staging files.
- `CADDY_DOMAIN`: реальный домен, например `budgeto.example.org`.
- `WEB_ORIGIN`: соответствующий HTTPS origin без пути и завершающего `/`,
  например `https://budgeto.example.org`. API проверяет это при старте.
- `IMPORT_STAGING_TTL_SECONDS`: срок хранения оригиналов, по умолчанию
  `86400` (24 часа), допустимо от 60 до 604800 секунд.

Защитите файл и запустите production из корня проекта:

```bash
sudo chown deploy:deploy /opt/budgeto/.env
sudo chmod 600 /opt/budgeto/.env
cd /opt/budgeto
docker compose --env-file .env -f infra/prod/compose.yml config --quiet
docker compose --env-file .env -f infra/prod/compose.yml up -d --build --wait --wait-timeout 180 --remove-orphans
```

`--env-file .env` обязателен: Compose подставляет значения из него.
Не выводите полный `compose config` в логи, он содержит секреты.
Миграции должны завершиться до запуска API и worker; Caddy ждёт healthy API.
Проверка API подтверждает HTTP readiness; состояние БД, очереди и worker
дополнительно проверяет контейнерный smoke test в CI.

Образы устанавливают зависимости через `npm ci` и включают локальный пакет
`@budgeto/contracts`. API, worker и migration работают с UID/GID 1000,
read-only корневой ФС, без Linux capabilities. Для временных данных есть
ограниченный tmpfs `/tmp`. Только API и worker монтируют `import_data`.
PostgreSQL получает свои credentials, Caddy только домен, Redis не получает
application secrets. Очередь Redis сохраняется в `redis_data` через AOF.

### Переход с контейнеров, работавших от root

Существующий `budgeto-prod_import_data` может принадлежать root.
Перед первым запуском новой версии остановите API и worker и смените
владельца тома. Выполняйте команды только для этого тома, после сборки
`budgeto-server:local`:

```bash
docker compose --env-file .env -f infra/prod/compose.yml stop api worker
docker compose --env-file .env -f infra/prod/compose.yml build api
docker run --rm --network none --read-only --user 0 \
  --mount type=volume,src=budgeto-prod_import_data,dst=/staging \
  --entrypoint sh budgeto-server:local -c \
  'chown -R 1000:1000 /staging && find /staging -type d -exec chmod 700 {} + && find /staging -type f -exec chmod 600 {} +'
docker compose --env-file .env -f infra/prod/compose.yml up -d --build --wait --wait-timeout 180 --remove-orphans
```

Это разовая операция для существующего тома. Новый том получает владельца
и права из образа. При другом Compose project name изменится имя тома.
Старые plaintext uploads production не читает: загрузите исходники заново.

## Import staging

Оригиналы находятся в `/app/.data/imports` в общем named volume API и worker.
Web-образ, Caddy, build context и rsync их не получают. Путь не возвращается
клиенту; API проверяет владельца import job перед чтением и удалением.

Сервер генерирует UUID-имя, создаёт файл эксклюзивно с правами `0600`, каталог
имеет `0700`. Данные записываются в AES-256-GCM envelope со случайным IV,
authentication tag и версией ключа. HKDF отделяет staging key от ключа TOTP.
Worker проверяет границы каталога, symlink, размер, срок хранения, GCM tag
и SHA-256 исходника перед разбором. Plaintext совместимость в production
запрещена, даже если выставить `IMPORT_STAGING_ALLOW_PLAINTEXT=true`.

После подтверждения импорта API удаляет оригинал и очищает `file_path`.
Если постановка в очередь или запись import job не удалась, API удаляет
созданный файл. Для failed/confirmed job доступно удаление staging через API.
Worker удаляет просроченные `.upload` при старте и раз в минуту, включая
файлы без записи в БД. Пока worker остановлен, sweep не выполняется, но
просроченный файл уже не разрешён к чтению. После удаления оригинала retry
невозможен; загрузите файл заново. Уже созданный preview остаётся в БД,
его можно подтвердить без оригинала. TTL не удаляет финансовые данные в БД.

При ошибке удаления после подтверждения операция остаётся подтверждённой,
а путь сохраняется для повторной очистки. Следите за ошибками cleanup в
логах и свободным местом тома. TTL ограничивает время, но не объём загрузок.
Удаление файла не гарантирует физическое стирание блоков или backup-копий.
Защищайте диск и backups отдельно; root хоста и процессы с ключом могут
расшифровать staging.

Не меняйте `AUTH_ENCRYPTION_KEY` и `IMPORT_STAGING_KEY_VERSION` при наличии
нужных staging uploads: предыдущая версия ключа автоматически не подбирается.
Для смены ключа остановите новые загрузки, завершите либо удалите оставшиеся
импорты и отдельно предусмотрите перенос TOTP secrets. При восстановлении
сохраняйте согласованность БД, очереди и томов; потерянный оригинал требует
повторной загрузки. Не включайте transient staging в общедоступные архивы.

## GitHub Actions

Secrets репозитория:

- `DEPLOY_SSH_PRIVATE_KEY`: закрытый SSH-ключ пользователя деплоя;
- `DEPLOY_KNOWN_HOSTS`: заранее проверенный host key сервера;
- `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_PATH`.

Не используйте `ssh-keyscan` в workflow как источник доверия. Application
secrets остаются в защищённом `.env` на сервере. Workflow на push в `main`
сначала запускает quality gate, включая Docker smoke test, затем rsync и
Compose с `--env-file .env`, `config --quiet` и `up --wait`. `.env`, `.data`,
`node_modules`, `dist` и `.git` не синхронизируются.

В CI `bash scripts/smoke-deployment.sh` поднимает одноразовый стек с реальной
production-конфигурацией и тестовыми секретами. Он проверяет сборки,
миграции, Caddy/API, encrypted upload, права, user scoping, очередь и том
после пересоздания контейнеров, разбор worker, expiry и удаление через API.
CI использует HTTP localhost без ACME; реальный TLS проверяется после деплоя.
Скрипт удаляет свои контейнеры и тома. Не запускайте его вместо production
на сервере, где заняты 80/443.

## Проверка после деплоя

```bash
docker compose --env-file .env -f infra/prod/compose.yml ps --all
curl --fail https://your-domain.example/api/health
```

Проверьте загрузку тестовой выписки и появление preview. Проверьте отсутствие
application secrets в логах и публичного доступа к staging. Обновление через
Compose сохраняет named volumes; `down --volumes` для production удалит БД,
очередь и staging. Не используйте эту команду при обычном обновлении.

Автоматические backups PostgreSQL и rollback релизов пока требуют отдельной
эксплуатационной задачи. Успех CI не подтверждает DNS, ACME, firewall и
настройки конкретного production-сервера.
