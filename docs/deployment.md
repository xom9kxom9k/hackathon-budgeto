# Деплой Budgetto

## Локальная разработка

Создайте локальный env-файл:

```bash
cp infra/dev/.env.example infra/dev/.env
```

Запустите весь локальный контур одной командой из корня репозитория:

```bash
docker compose -f infra/dev/compose.yml up --build
```

Web будет доступен на `http://localhost:5173`, API — на
`http://localhost:3000/api/health`.

Остановка:

```bash
docker compose -f infra/dev/compose.yml down
```

## Первичная настройка production-сервера

Сервер должен иметь Linux, Docker Engine, Docker Compose v2 и открытые порты
`80` и `443`. DNS production-домена должен указывать на этот сервер.

Создайте отдельного пользователя для деплоя и дайте ему доступ к Docker:

```bash
sudo useradd --create-home --shell /bin/bash deploy
sudo usermod --append --groups docker deploy
sudo install --directory --owner deploy --group deploy /opt/budgetto
```

Скопируйте `infra/prod/.env.example` в `/opt/budgetto/.env` и заполните реальные
значения. В частности, `CADDY_DOMAIN`, `WEB_ORIGIN`, `DATABASE_URL`,
`POSTGRES_PASSWORD` и `AUTH_ENCRYPTION_KEY` должны соответствовать production.

Защитите env-файл:

```bash
sudo chown deploy:deploy /opt/budgetto/.env
sudo chmod 600 /opt/budgetto/.env
```

Проверьте конфигурацию вручную:

```bash
cd /opt/budgetto
docker compose -f infra/prod/compose.yml config
docker compose -f infra/prod/compose.yml up -d --build --remove-orphans
```

Application secrets не должны попадать в Git или GitHub Actions. Root `.env`
на сервере используется Compose через `../../.env` относительно
`infra/prod/compose.yml`.

## GitHub Actions secrets

Откройте `Settings → Secrets and variables → Actions`, выберите вкладку
`Secrets`, нажмите `New repository secret` и добавьте:

- `DEPLOY_SSH_PRIVATE_KEY` — закрытый ключ пользователя `deploy`;
- `DEPLOY_KNOWN_HOSTS` — заранее проверенная строка host key сервера;
- `DEPLOY_HOST` — hostname или IP сервера;
- `DEPLOY_PORT` — SSH-порт, обычно `22`;
- `DEPLOY_USER` — `deploy`;
- `DEPLOY_PATH` — `/opt/budgetto`.

Workflow `.github/workflows/deploy-production.yml` запускается на push в
`main`, синхронизирует исходники и выполняет production Compose по SSH.
Файлы `.env`, `dist`, `node_modules` и `.git` не синхронизируются.

Для подготовки `DEPLOY_KNOWN_HOSTS` получите ключ сервера безопасным способом
и проверьте его fingerprint вне CI. Не используйте автоматический `ssh-keyscan`
в workflow как источник доверия.

## Проверка после деплоя

Проверьте контейнеры:

```bash
docker compose -f infra/prod/compose.yml ps --all
```

Проверьте API внутри production-сети:

```bash
docker compose -f infra/prod/compose.yml exec -T api \
  node -e "fetch('http://127.0.0.1:3000/api/health').then(async r => console.log(await r.text()))"
```

Публичная проверка выполняется через production-домен:

```bash
curl --fail https://your-domain.example/api/health
```

Автоматические backup PostgreSQL и rollback релизов пока не входят в этот
контур и должны быть добавлены отдельной эксплуатационной задачей.

## Обновление названия на Budgetto

Для новой установки примеры используют `budgetto`. При обновлении существующей
установки сохраните текущие `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
`DATABASE_URL`, `DEPLOY_PATH` и имя проекта Compose. Для существующих томов запускайте
Compose с прежним именем проекта через `docker compose -p <прежнее-имя>`.
Переименование продукта само по себе не переносит базу данных или тома.

После обновления потребуется повторный вход; настройки темы, языка и боковой
панели в браузере вернутся к значениям по умолчанию. В пользовательских профилях
импорта замените префикс `budgeto-` на `budgetto-` и повторно подготовьте незавершённые
предпросмотры импорта перед подтверждением.

Строки `BUDGETO-STAGING`, `budgeto-local-development-key`,
`budgeto/import-staging/aes-256-gcm/` и `budgeto:vault:genesis:v1` сохранены для
чтения зашифрованных данных и проверки существующей цепочки хешей. Имя очереди
`budgeto-imports` сохранено для обработки уже поставленных заданий. Ссылки на
исходный GitHub-репозиторий сохраняют его фактический адрес.
