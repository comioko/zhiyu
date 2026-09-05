#!/usr/bin/env bash
# Installed root-owned; credentials live in /etc/zhiyu/database.cnf (0600).
set -Eeuo pipefail
umask 077
test -r /etc/zhiyu/database.cnf || { echo 'Database backup configuration is missing'; exit 1; }
if command -v mysqldump >/dev/null; then
  dump=mysqldump
elif command -v mariadb-dump >/dev/null; then
  dump=mariadb-dump
else
  echo 'Install a MySQL-compatible backup client before enabling backend deployment'
  exit 1
fi
backup=/var/backups/zhiyu/zhiguang-$(date -u +%Y%m%dT%H%M%SZ).sql.gz
trap 'rm -f "$backup.partial"' EXIT
"$dump" --defaults-extra-file=/etc/zhiyu/database.cnf --single-transaction --routines --events --databases zhiguang | gzip > "$backup.partial"
gzip -t "$backup.partial"
mv "$backup.partial" "$backup"
find /var/backups/zhiyu -maxdepth 1 -type f -name 'zhiguang-*.sql.gz' -mtime +14 -delete
echo 'Database backup completed'
