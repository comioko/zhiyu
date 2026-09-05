#!/usr/bin/env bash
# GitHub Ubuntu runner only: JDK 21, mysql, openssl and curl must be installed.
# Required services: MySQL 8.0 at 127.0.0.1:3306 (root / ci-only), and
# Redis at 127.0.0.1:6379 without a password. Run mvn -f zhiyu_be/pom.xml verify before this script.
set -Eeuo pipefail
umask 077

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
jar_file="$project_dir/zhiyu_be/target/zhiyu-1.0-SNAPSHOT.jar"
for executable in java mysql openssl curl; do
  command -v "$executable" >/dev/null || {
    echo "Missing required executable: $executable" >&2
    exit 1
  }
done
[[ -f "$jar_file" ]] || {
  echo 'Build zhiyu_be/target/zhiyu-1.0-SNAPSHOT.jar with mvn -f zhiyu_be/pom.xml verify first.' >&2
  exit 1
}

smoke_dir="$(mktemp -d)"
application_pid=''
cleanup() {
  local result=$?
  trap - EXIT INT TERM
  if [[ -n "$application_pid" ]]; then
    if kill -0 "$application_pid" 2>/dev/null; then
      kill "$application_pid" 2>/dev/null || true
      for ((attempt = 0; attempt < 10; attempt++)); do
        kill -0 "$application_pid" 2>/dev/null || break
        sleep 1
      done
      if kill -0 "$application_pid" 2>/dev/null; then
        kill -KILL "$application_pid" 2>/dev/null || true
      fi
    fi
    wait "$application_pid" 2>/dev/null || true
  fi
  if (( result != 0 )); then
    echo 'Backend smoke test failed. Last application log lines:' >&2
    [[ ! -f "$smoke_dir/application.log" ]] || tail -n 200 "$smoke_dir/application.log" >&2
    [[ ! -f "$smoke_dir/health.json" ]] || cat "$smoke_dir/health.json" >&2
    [[ ! -f "$smoke_dir/feed.json" ]] || cat "$smoke_dir/feed.json" >&2
  fi
  rm -rf -- "$smoke_dir"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# --no-defaults and an isolated HOME prevent reading developer MySQL settings.
mysql_ci() {
  env -i PATH="$PATH" HOME="$smoke_dir" MYSQL_PWD='ci-only' \
    mysql --no-defaults --protocol=TCP --host=127.0.0.1 --port=3306 \
    --user=root --connect-timeout=5 --batch --skip-column-names "$@"
}
mysql_ci --execute='CREATE DATABASE IF NOT EXISTS zhiyu_ci CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'

# genpkey writes PKCS#8; derive the matching X.509 SubjectPublicKeyInfo public key.
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 \
  -out "$smoke_dir/private.pem" 2>/dev/null
openssl pkey -in "$smoke_dir/private.pem" -pubout \
  -out "$smoke_dir/public.pem" 2>/dev/null

# Deliberately do not inherit secrets, Spring overrides, proxy settings, or JVM
# options from the caller. The explicit config locations exclude application.yml
# both in the jar and in the working directory. Every endpoint stays on loopback.
(
  cd -- "$smoke_dir"
  exec env -i PATH="$PATH" JAVA_HOME="${JAVA_HOME:-}" HOME="$smoke_dir" \
    TMPDIR="$smoke_dir" LANG=C.UTF-8 \
    SERVER_PORT=18080 \
    DB_URL='jdbc:mysql://127.0.0.1:3306/zhiyu_ci?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true' \
    DB_USERNAME=root DB_PASSWORD=ci-only DB_POOL_MAX_SIZE=5 DB_POOL_MIN_IDLE=1 \
    REDIS_HOST=127.0.0.1 REDIS_PORT=6379 REDIS_PASSWORD='' REDIS_DB=0 \
    REDIS_POOL_MAX_ACTIVE=5 REDIS_POOL_MAX_IDLE=5 REDIS_POOL_MIN_IDLE=1 \
    JWT_PRIVATE_KEY="file:$smoke_dir/private.pem" JWT_PUBLIC_KEY="file:$smoke_dir/public.pem" \
    MAIL_HOST=127.0.0.1 MAIL_PORT=2525 MAIL_USERNAME=ci-only MAIL_PASSWORD=ci-only \
    MAIL_HEALTH_ENABLED=false \
    OSS_ENDPOINT=http://127.0.0.1:19090 OSS_ACCESS_KEY_ID=ci-only \
    OSS_ACCESS_KEY_SECRET=ci-only OSS_BUCKET=zhiyu-ci OSS_PUBLIC_DOMAIN=http://127.0.0.1:19090 \
    ES_URIS=http://127.0.0.1:19200 ES_USERNAME=ci-only ES_PASSWORD=ci-only ES_HEALTH_ENABLED=false \
    KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:19092 KAFKA_LISTENER_AUTO_STARTUP=false \
    CANAL_ENABLED=false CANAL_HOST=127.0.0.1 CANAL_PORT=11111 \
    CANAL_DESTINATION=ci-only CANAL_USERNAME=ci-only CANAL_PASSWORD=ci-only \
    CANAL_FILTER='zhiyu_ci\.outbox' \
    DEEPSEEK_API_KEY='' DEEPSEEK_BASE_URL=http://127.0.0.1:19091 \
    QWEN_API_KEY='' QWEN_BASE_URL=http://127.0.0.1:19091 \
    SPRING_AI_OPENAI_API_KEY='' BACKEND_LOG_FILE='' \
    java -jar "$jar_file" \
      --spring.config.location=classpath:/application-prod.yml,classpath:/application-lite.yml \
      --spring.profiles.active=prod,lite
) >"$smoke_dir/application.log" 2>&1 &
application_pid=$!

echo 'Waiting for backend health on 127.0.0.1:18080...'
deadline=$((SECONDS + 180))
healthy=false
while (( SECONDS < deadline )); do
  if ! kill -0 "$application_pid" 2>/dev/null; then
    echo 'Backend exited before becoming healthy.' >&2
    exit 1
  fi
  health_code="$(curl --noproxy '*' --silent --connect-timeout 2 --max-time 5 \
    --output "$smoke_dir/health.json" --write-out '%{http_code}' \
    http://127.0.0.1:18080/actuator/health || true)"
  if [[ "$health_code" == 200 ]] && \
    grep -Eq '"status"[[:space:]]*:[[:space:]]*"UP"' "$smoke_dir/health.json"; then
    healthy=true
    break
  fi
  sleep 2
done
if [[ "$healthy" != true ]]; then
  echo 'Backend did not become healthy within 180 seconds.' >&2
  exit 1
fi

feed_code="$(curl --noproxy '*' --silent --show-error --connect-timeout 2 --max-time 15 \
  --output "$smoke_dir/feed.json" --write-out '%{http_code}' \
  'http://127.0.0.1:18080/api/v1/knowposts/feed?page=1&size=5')"
if [[ "$feed_code" != 200 ]]; then
  echo "Public feed returned HTTP $feed_code; expected 200." >&2
  exit 1
fi

successful_migrations="$(mysql_ci zhiyu_ci --execute="SELECT COUNT(DISTINCT version) FROM flyway_schema_history WHERE version IN ('1', '2') AND success = 1;")"
failed_migrations="$(mysql_ci zhiyu_ci --execute='SELECT COUNT(*) FROM flyway_schema_history WHERE success = 0;')"
if [[ "$successful_migrations" != 2 || "$failed_migrations" != 0 ]]; then
  echo 'Flyway V1/V2 must both succeed and no failed migration may remain.' >&2
  exit 1
fi

kill -0 "$application_pid" 2>/dev/null || {
  echo 'Backend exited during verification.' >&2
  exit 1
}
echo 'Backend smoke test passed: health UP, public feed HTTP 200, Flyway V1/V2 successful.'
