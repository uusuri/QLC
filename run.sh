#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-}"

die() {
  printf 'Ошибка: %s\n' "$*" >&2
  exit 1
}

if [[ $# -ne 1 || ("$MODE" != dev && "$MODE" != prod) ]]; then
  printf 'Использование: ./run.sh dev | ./run.sh prod\n' >&2
  exit 2
fi

ENV_FILE="$ROOT/.env.$MODE"
[[ -f "$ENV_FILE" ]] || die "Не найден $ENV_FILE"
bash -n "$ENV_FILE" >/dev/null 2>&1 || die "Ошибка синтаксиса в $ENV_FILE"

for program in docker java node npm; do
  command -v "$program" >/dev/null 2>&1 || die "Не найден $program"
done
docker info >/dev/null 2>&1 || die 'Docker не запущен'

if [[ "$MODE" == prod ]]; then
  command -v git >/dev/null 2>&1 || die 'Не найден git'
  branch="$(git -C "$ROOT" branch --show-current)"
  [[ "$branch" == main ]] || die 'Prod можно запускать только из ветки main'
  [[ -z "$(git -C "$ROOT" status --porcelain)" ]] || die 'Для prod рабочая папка должна быть без незакоммиченных изменений'
fi

# .env хранит секреты, поэтому его значения не печатаем в лог.
if [[ "$MODE" == dev ]]; then
  unset SPRING_DATASOURCE_URL SPRING_DATASOURCE_USERNAME SPRING_DATASOURCE_PASSWORD
fi
set -a
source "$ENV_FILE"
set +a

[[ -n "${SPRING_LOCAL_PORT:-}" ]] || die 'Не задан SPRING_LOCAL_PORT'
[[ -n "${REDIS_PORT:-}" ]] || die 'Не задан REDIS_PORT'
[[ "${SPRING_PROFILES_ACTIVE:-}" == "$MODE" ]] || die "В $ENV_FILE указан неверный Spring-профиль"

BACKEND_PORT="$SPRING_LOCAL_PORT"
if [[ "$MODE" == dev ]]; then
  [[ "${POSTGRES_HOST:-}" == localhost || "${POSTGRES_HOST:-}" == 127.0.0.1 ]] || die 'Dev должен использовать локальный PostgreSQL'
  [[ -z "${SPRING_DATASOURCE_URL:-}" ]] || die 'В dev не должен быть задан SPRING_DATASOURCE_URL'
  FRONTEND_PORT=3001
  COMPOSE_FILE="$ROOT/docker-compose.dev.yml"
  COMPOSE_ARGS=(--env-file "$ENV_FILE" -f "$COMPOSE_FILE")
else
  [[ -n "${SPRING_DATASOURCE_URL:-}" ]] || die 'Не задан SPRING_DATASOURCE_URL для Neon'
  [[ "$SPRING_DATASOURCE_URL" == *sslmode=require* ]] || die 'В JDBC URL требуется sslmode=require'
  [[ -n "${POSTGRES_PASSWORD:-}" && "$POSTGRES_PASSWORD" != __SET_NEON_PASSWORD__ ]] || die 'Укажи пароль Neon в .env.prod'
  FRONTEND_PORT=3000
  COMPOSE_FILE="$ROOT/docker-compose.prod.yml"
  COMPOSE_ARGS=(--env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p qlc-prod)
fi

port_available() {
  node -e '
    const server = require("node:net").createServer();
    server.once("error", () => process.exit(1));
    server.listen(Number(process.argv[1]), "127.0.0.1", () => server.close(() => process.exit(0)));
  ' "$1"
}

port_open() {
  node -e '
    const socket = require("node:net").connect(Number(process.argv[1]), "127.0.0.1");
    socket.once("connect", () => process.exit(0));
    socket.once("error", () => process.exit(1));
    socket.setTimeout(1000, () => process.exit(1));
  ' "$1"
}

port_available "$BACKEND_PORT" || die "Порт backend $BACKEND_PORT уже занят; существующий процесс не трогаю"
port_available "$FRONTEND_PORT" || die "Порт frontend $FRONTEND_PORT уже занят; существующий процесс не трогаю"

printf 'Собираю backend...\n'
(cd "$ROOT/backend" && ./gradlew bootJar --no-daemon)
JAR="$ROOT/backend/build/libs/QLC-0.0.1-SNAPSHOT.jar"
[[ -f "$JAR" ]] || die "Не найден собранный backend: $JAR"

if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  printf 'Устанавливаю зависимости frontend...\n'
  (cd "$ROOT/frontend" && npm ci)
fi

if [[ "$MODE" == prod ]]; then
  printf 'Собираю frontend для prod...\n'
  (cd "$ROOT/frontend" && BACKEND_INTERNAL_URL="http://127.0.0.1:$BACKEND_PORT" npm run build)
fi

printf 'Поднимаю инфраструктуру %s...\n' "$MODE"
if [[ "$MODE" == dev ]]; then
  docker compose "${COMPOSE_ARGS[@]}" up -d postgres redis
else
  docker compose "${COMPOSE_ARGS[@]}" up -d redis
fi

ready=false
for ((attempt = 0; attempt < 30; attempt++)); do
  if [[ "$MODE" == dev ]] && ! docker compose "${COMPOSE_ARGS[@]}" exec -T postgres pg_isready -q >/dev/null 2>&1; then
    sleep 1
    continue
  fi
  if docker compose "${COMPOSE_ARGS[@]}" exec -T redis redis-cli ping 2>/dev/null | grep -qx PONG; then
    ready=true
    break
  fi
  sleep 1
done
[[ "$ready" == true ]] || die 'PostgreSQL или Redis не успели запуститься'

backend_pid=''
frontend_pid=''
cleanup() {
  trap - EXIT
  if [[ -n "$frontend_pid" ]]; then
    kill "$frontend_pid" 2>/dev/null || true
    wait "$frontend_pid" 2>/dev/null || true
  fi
  if [[ -n "$backend_pid" ]]; then
    kill "$backend_pid" 2>/dev/null || true
    wait "$backend_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf 'Запускаю backend (%s)...\n' "$MODE"
java -jar "$JAR" &
backend_pid=$!

for ((attempt = 0; attempt < 120; attempt++)); do
  kill -0 "$backend_pid" 2>/dev/null || die 'Backend завершился до запуска frontend'
  if port_open "$BACKEND_PORT"; then
    break
  fi
  sleep 1
done
port_open "$BACKEND_PORT" || die 'Backend не начал слушать порт за 120 секунд'

printf 'Запускаю frontend (%s)...\n' "$MODE"
(
  unset POSTGRES_PASSWORD JWT_SECRET TELEGRAM_BOT_TOKEN
  export BACKEND_INTERNAL_URL="http://127.0.0.1:$BACKEND_PORT"
  cd "$ROOT/frontend"
  if [[ "$MODE" == dev ]]; then
    exec node node_modules/next/dist/bin/next dev -H 127.0.0.1 -p "$FRONTEND_PORT"
  else
    exec node node_modules/next/dist/bin/next start -H 127.0.0.1 -p "$FRONTEND_PORT"
  fi
) &
frontend_pid=$!

for ((attempt = 0; attempt < 60; attempt++)); do
  kill -0 "$frontend_pid" 2>/dev/null || die 'Frontend завершился при запуске'
  if port_open "$FRONTEND_PORT"; then
    break
  fi
  sleep 1
done
port_open "$FRONTEND_PORT" || die 'Frontend не начал слушать порт за 60 секунд'

printf '\n%s готов: http://127.0.0.1:%s\n' "$MODE" "$FRONTEND_PORT"
printf 'Ctrl+C остановит backend и frontend. Контейнеры и данные останутся.\n\n'

while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 1
done
die 'Один из процессов завершился; второй будет остановлен'
