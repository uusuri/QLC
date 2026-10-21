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

for program in docker java node npm kubectl minikube; do
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
[[ "${REDIS_HOST:-}" == localhost || "${REDIS_HOST:-}" == 127.0.0.1 ]] || die "Redis $MODE должен использовать локальный port-forward"

BACKEND_PORT="$SPRING_LOCAL_PORT"
if [[ "$MODE" == dev ]]; then
  [[ "${POSTGRES_HOST:-}" == localhost || "${POSTGRES_HOST:-}" == 127.0.0.1 ]] || die 'Dev должен использовать локальный PostgreSQL'
  [[ -z "${SPRING_DATASOURCE_URL:-}" ]] || die 'В dev не должен быть задан SPRING_DATASOURCE_URL'
  FRONTEND_PORT=3001
  WORKER_PORT="${WORKER_MANAGEMENT_PORT:-9094}"
  KUBE_PROFILE=minikube
  KUBE_NAMESPACE=qlc-dev
  COMPOSE_FILE="$ROOT/docker-compose.dev.yml"
  COMPOSE_ARGS=(--env-file "$ENV_FILE" -f "$COMPOSE_FILE")
else
  [[ -n "${SPRING_DATASOURCE_URL:-}" ]] || die 'Не задан SPRING_DATASOURCE_URL для Neon'
  [[ "$SPRING_DATASOURCE_URL" == *sslmode=require* ]] || die 'В JDBC URL требуется sslmode=require'
  [[ -n "${POSTGRES_PASSWORD:-}" && "$POSTGRES_PASSWORD" != __SET_NEON_PASSWORD__ ]] || die 'Укажи пароль Neon в .env.prod'
  FRONTEND_PORT=3000
  WORKER_PORT="${WORKER_MANAGEMENT_PORT:-9093}"
  KUBE_PROFILE=qlc-prod
  KUBE_NAMESPACE=qlc-prod
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

redis_ready() {
  node -e '
    const socket = require("node:net").connect(Number(process.argv[2]), process.argv[1]);
    let reply = "";
    socket.once("connect", () => socket.write("PING\r\n"));
    socket.on("data", (chunk) => {
      reply += chunk.toString();
      if (reply.includes("\r\n")) process.exit(reply === "+PONG\r\n" ? 0 : 1);
    });
    socket.once("error", () => process.exit(1));
    socket.once("end", () => process.exit(1));
    socket.setTimeout(1000, () => process.exit(1));
  ' "${REDIS_HOST:-127.0.0.1}" "$REDIS_PORT"
}

backend_pid=''
worker_pid=''
frontend_pid=''
redis_forward_pid=''
startup_pid=''
stop_minikube=false

run_step() {
  local status=0
  "$@" &
  startup_pid=$!
  wait "$startup_pid" || status=$?
  startup_pid=''
  return "$status"
}

stop_process() {
  local pid="$1"
  local attempt
  [[ -n "$pid" ]] || return 0
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    for ((attempt = 0; attempt < 15; attempt++)); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 1
    done
    if kill -0 "$pid" 2>/dev/null; then
      kill -KILL "$pid" 2>/dev/null || true
    fi
  fi
  wait "$pid" 2>/dev/null || true
}

cleanup() {
  local exit_status=$?
  trap - EXIT
  trap '' INT TERM
  stop_process "$startup_pid"
  stop_process "$frontend_pid"
  stop_process "$worker_pid"
  stop_process "$backend_pid"
  stop_process "$redis_forward_pid"
  if [[ "$stop_minikube" == true ]]; then
    printf 'Останавливаю Kubernetes %s (профиль %s)...\n' "$MODE" "$KUBE_PROFILE"
    minikube --profile="$KUBE_PROFILE" stop --keep-context-active \
      || printf 'Не удалось остановить кластер; выполни minikube --profile=%s stop вручную.\n' "$KUBE_PROFILE" >&2
  fi
  return "$exit_status"
}

check_redis_forward() {
  if ! kill -0 "$redis_forward_pid" 2>/dev/null; then
    die "Redis port-forward завершился; останавливаю $MODE"
  fi
}

port_available "$BACKEND_PORT" || die "Порт backend $BACKEND_PORT уже занят; существующий процесс не трогаю"
port_available "$FRONTEND_PORT" || die "Порт frontend $FRONTEND_PORT уже занят; существующий процесс не трогаю"
port_available "$WORKER_PORT" || die "Порт метрик worker $WORKER_PORT уже занят; существующий процесс не трогаю"

API_MANAGEMENT_PORT="${MANAGEMENT_LOCAL_PORT:-9092}"
if [[ "$MODE" == prod ]]; then
  API_MANAGEMENT_PORT="${MANAGEMENT_LOCAL_PORT:-9091}"
fi
port_available "$API_MANAGEMENT_PORT" || die "Порт метрик API $API_MANAGEMENT_PORT уже занят; существующий процесс не трогаю"

ports=("$BACKEND_PORT" "$FRONTEND_PORT" "$REDIS_PORT" "$WORKER_PORT" "$API_MANAGEMENT_PORT")
for ((i = 0; i < ${#ports[@]}; i++)); do
  for ((j = i + 1; j < ${#ports[@]}; j++)); do
    [[ "${ports[i]}" != "${ports[j]}" ]] || die 'Порты API, frontend, Redis и метрик должны различаться'
  done
done

[[ "$REDIS_PORT" != "$BACKEND_PORT" && "$REDIS_PORT" != "$FRONTEND_PORT" ]] || die 'Порты Redis, backend и frontend должны различаться'
port_available "$REDIS_PORT" || die "Порт Redis $REDIS_PORT уже занят. Если открыт ручной port-forward, останови его через Ctrl+C"

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf 'Собираю API и worker...\n'
(cd "$ROOT/backend" && ./gradlew :api:bootJar :worker:bootJar --no-daemon)
API_JAR="$ROOT/backend/api/build/libs/qlc-api.jar"
WORKER_JAR="$ROOT/backend/worker/build/libs/qlc-worker.jar"
[[ -f "$API_JAR" ]] || die "Не найден собранный API: $API_JAR"
[[ -f "$WORKER_JAR" ]] || die "Не найден собранный worker: $WORKER_JAR"

if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  printf 'Устанавливаю зависимости frontend...\n'
  (cd "$ROOT/frontend" && npm ci)
fi

if [[ "$MODE" == prod ]]; then
  printf 'Собираю frontend для prod...\n'
  (cd "$ROOT/frontend" && BACKEND_INTERNAL_URL="http://127.0.0.1:$BACKEND_PORT" npm run build)
fi

printf 'Поднимаю инфраструктуру %s...\n' "$MODE"
# После начала этого этапа run.sh управляет остановкой выбранного профиля.
# Dev и prod используют разные кластеры; stop сохраняет PVC и данные.
stop_minikube=true
if ! run_step minikube --profile="$KUBE_PROFILE" status >/dev/null 2>&1; then
  printf 'Запускаю Kubernetes %s (профиль %s)...\n' "$MODE" "$KUBE_PROFILE"
  run_step minikube --profile="$KUBE_PROFILE" start --driver=docker --keep-context
fi
run_step kubectl --context="$KUBE_PROFILE" --request-timeout=15s apply -f "$ROOT/kubernetes/$MODE/redis.yaml"
run_step kubectl --context="$KUBE_PROFILE" -n "$KUBE_NAMESPACE" rollout status statefulset/redis --timeout=180s

printf 'Открываю Redis port-forward на 127.0.0.1:%s...\n' "$REDIS_PORT"
kubectl --context="$KUBE_PROFILE" -n "$KUBE_NAMESPACE" port-forward service/redis \
  "$REDIS_PORT:6379" --address=127.0.0.1 &
redis_forward_pid=$!
if [[ "$MODE" == dev ]]; then
  run_step docker compose "${COMPOSE_ARGS[@]}" up -d postgres
fi

ready=false
for ((attempt = 0; attempt < 30; attempt++)); do
  check_redis_forward
  if [[ "$MODE" == dev ]] && ! docker compose "${COMPOSE_ARGS[@]}" exec -T postgres pg_isready -q >/dev/null 2>&1; then
    sleep 1
    continue
  fi
  if redis_ready; then
    ready=true
    break
  fi
  sleep 1
done
[[ "$ready" == true ]] || die 'PostgreSQL или Redis не успели запуститься'

printf 'Запускаю API (%s); он применит миграции перед стартом worker...\n' "$MODE"
java -jar "$API_JAR" &
backend_pid=$!

for ((attempt = 0; attempt < 120; attempt++)); do
  check_redis_forward
  kill -0 "$backend_pid" 2>/dev/null || die 'Backend завершился до запуска frontend'
  if port_open "$BACKEND_PORT"; then
    break
  fi
  sleep 1
done
port_open "$BACKEND_PORT" || die 'Backend не начал слушать порт за 120 секунд'

# Worker shares DB/Redis settings, but has no need for API authentication/mail secrets.
printf 'Запускаю worker (%s)...\n' "$MODE"
(
  unset JWT_SECRET JWT_EXPIRATION TELEGRAM_BOT_TOKEN RESEND_API_KEY
  export WORKER_MANAGEMENT_PORT="$WORKER_PORT"
  exec java -jar "$WORKER_JAR"
) &
worker_pid=$!
for ((attempt = 0; attempt < 120; attempt++)); do
  check_redis_forward
  kill -0 "$backend_pid" 2>/dev/null || die 'API завершился до запуска worker'
  kill -0 "$worker_pid" 2>/dev/null || die 'Worker завершился при запуске'
  if port_open "$WORKER_PORT"; then
    break
  fi
  sleep 1
done
port_open "$WORKER_PORT" || die 'Worker не начал слушать порт за 120 секунд'

printf 'Запускаю frontend (%s)...\n' "$MODE"
(
  unset POSTGRES_PASSWORD SPRING_DATASOURCE_PASSWORD JWT_SECRET TELEGRAM_BOT_TOKEN RESEND_API_KEY
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
  check_redis_forward
  kill -0 "$backend_pid" 2>/dev/null || die 'API завершился до готовности frontend'
  kill -0 "$worker_pid" 2>/dev/null || die 'Worker завершился до готовности frontend'
  kill -0 "$frontend_pid" 2>/dev/null || die 'Frontend завершился при запуске'
  if port_open "$FRONTEND_PORT"; then
    break
  fi
  sleep 1
done
port_open "$FRONTEND_PORT" || die 'Frontend не начал слушать порт за 60 секунд'

printf '\n%s готов: http://127.0.0.1:%s\n' "$MODE" "$FRONTEND_PORT"
printf 'Метрики API: http://127.0.0.1:%s/actuator/prometheus\n' "$API_MANAGEMENT_PORT"
printf 'Метрики worker: http://127.0.0.1:%s/actuator/prometheus\n' "$WORKER_PORT"
printf 'Ctrl+C остановит API, worker, frontend, port-forward и профиль %s. PostgreSQL и данные останутся.\n\n' "$KUBE_PROFILE"

while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$worker_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  check_redis_forward
  sleep 1
done
die 'Один из процессов завершился; второй будет остановлен'
