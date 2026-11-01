#!/usr/bin/env bash
set -euo pipefail

export POSTGRES_DB=budgeto_smoke
export POSTGRES_USER=budgeto
export POSTGRES_PASSWORD
POSTGRES_PASSWORD=$(openssl rand -hex 24)
export DATABASE_URL="postgresql://budgeto:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB"
export AUTH_ENCRYPTION_KEY
AUTH_ENCRYPTION_KEY=$(openssl rand -hex 32)
export WEB_ORIGIN=https://localhost
export CADDY_DOMAIN=http://localhost
export BUDGETO_IMAGE_TAG=deployment-smoke
export IMPORT_PROFILES_JSON
IMPORT_PROFILES_JSON=$(cat docs/import-profiles.example.json)

compose=(docker compose -p budgeto-deployment-smoke -f infra/prod/compose.yml)
config_path=$(mktemp)
cleanup() {
  result=$?
  if [ "$result" -ne 0 ]; then
    "${compose[@]}" logs --no-color --tail 100 api worker migration caddy
  fi
  "${compose[@]}" down --volumes --remove-orphans
  rm -f "$config_path"
  exit "$result"
}
trap cleanup EXIT

if (unset AUTH_ENCRYPTION_KEY; "${compose[@]}" config --quiet >/dev/null 2>&1); then
  echo 'Production config accepted a missing encryption key' >&2
  exit 1
fi
"${compose[@]}" config --format json > "$config_path"
node scripts/check-deployment-config.cjs "$config_path"
"${compose[@]}" build api caddy
if "${compose[@]}" run --rm --no-deps -e AUTH_ENCRYPTION_KEY=replace-with-a-long-random-secret api \
  node -e "require('./dist/apps/api/shared/import-staging-crypto').assertImportStagingKey()"; then
  echo 'Production accepted a placeholder encryption key' >&2
  exit 1
fi
"${compose[@]}" up -d --build --wait --wait-timeout 180
curl --fail --retry 10 --retry-delay 1 --retry-connrefused http://localhost/api/health
curl --fail http://localhost/ | grep -q '<div id="root">'
"${compose[@]}" exec -T api sh -c 'test ! -e /app/.env && test ! -w /app/package.json'
"${compose[@]}" stop worker
"${compose[@]}" exec -T api node - seed < scripts/deployment-smoke.cjs
"${compose[@]}" stop api redis
"${compose[@]}" up -d --no-deps --force-recreate --wait --wait-timeout 180 redis api worker
"${compose[@]}" exec -T api node - verify < scripts/deployment-smoke.cjs
curl --fail http://localhost/.data/imports/ | grep -q '<div id="root">'
echo 'Production Compose smoke test passed'
