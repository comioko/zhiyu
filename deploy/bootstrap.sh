#!/usr/bin/env bash
# Run as root from this directory. Does not install a database or start the app.
set -Eeuo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run as root'; exit 1; }
cd "$(dirname "$0")"
for binary in java nginx sudo curl openssl flock; do
  command -v "$binary" >/dev/null || { echo "Missing prerequisite: $binary"; exit 1; }
done
id zhiyu >/dev/null 2>&1 || useradd --system --home-dir /var/lib/zhiyu --create-home --shell /usr/sbin/nologin zhiyu
id zhiyu-deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash zhiyu-deploy
install -d -m 755 /srv/zhiyu /srv/zhiyu/releases /srv/zhiyu/incoming /srv/zhiyu/backend /srv/zhiyu/frontend
chown zhiyu-deploy:zhiyu-deploy /srv/zhiyu /srv/zhiyu/{releases,incoming,backend,frontend}
install -d -m 750 -o root -g zhiyu /etc/zhiyu /etc/zhiyu/keys
install -d -m 750 -o zhiyu -g zhiyu /var/log/zhiyu
install -d -m 700 /var/backups/zhiyu
install -m 755 db-backup.sh /usr/local/sbin/zhiyu-db-backup
install -m 644 zhiyu-backend.service /etc/systemd/system/zhiyu-backend.service
cat > /etc/sudoers.d/zhiyu-deploy <<'EOF'
zhiyu-deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart zhiyu-backend.service, /usr/bin/systemctl stop zhiyu-backend.service, /usr/local/sbin/zhiyu-db-backup
EOF
chmod 440 /etc/sudoers.d/zhiyu-deploy
visudo -cf /etc/sudoers.d/zhiyu-deploy
install -m 644 nginx.conf /etc/nginx/conf.d/zhiyu.conf
nginx -t
systemctl daemon-reload
systemctl reload nginx
echo 'Deployment directories and web proxy installed; backend is not started.'
