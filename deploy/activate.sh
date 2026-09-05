#!/usr/bin/env bash
set -Eeuo pipefail

release=${1:?usage: activate.sh COMMIT-RUN-ATTEMPT}
components=${2:-all}
[[ "$components" == all || "$components" == frontend ]] || exit 2
[[ "$release" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || { echo 'Invalid release ID'; exit 2; }
base=/srv/zhiyu
exec 9>"$base/deploy.lock"
flock -w 600 9
incoming="$base/incoming/$release"
destination="$base/releases/$release"
test ! -e "$destination"
(cd "$incoming" && sha256sum -c release.tar.gz.sha256)
mkdir "$destination"
tar -xzf "$incoming/release.tar.gz" -C "$destination" --no-same-owner --no-same-permissions
test -s "$destination/backend/app.jar"
test -s "$destination/frontend/index.html"
test "$(cat "$destination/REVISION")" = "${release%%-*}"
chmod -R u=rwX,go=rX "$destination"

previous_backend=$(readlink "$base/backend/current" || true)
previous_frontend=$(readlink "$base/frontend/current" || true)
activated=false
link_release() {
  ln -s "$1" "$2.next"
  mv -Tf "$2.next" "$2"
}
rollback() {
  result=$?
  trap - EXIT
  if [[ "$result" != 0 && "$activated" == true ]]; then
    echo 'Deployment failed; restoring the previous application release.'
    if [[ "$components" == all ]]; then
      if [[ -n "$previous_backend" ]]; then
        link_release "$previous_backend" "$base/backend/current"
        sudo -n /usr/bin/systemctl restart zhiyu-backend.service || true
      else
        sudo -n /usr/bin/systemctl stop zhiyu-backend.service || true
        rm -f "$base/backend/current"
      fi
    fi
    if [[ -n "$previous_frontend" ]]; then
      link_release "$previous_frontend" "$base/frontend/current"
    else
      rm -f "$base/frontend/current"
    fi
    echo 'Database migrations are not reversed automatically. Database backup is retained.'
  fi
  exit "$result"
}
trap rollback EXIT

if [[ "$components" == all ]]; then
  # The root-owned helper creates a private database backup before Flyway runs.
  sudo -n /usr/local/sbin/zhiyu-db-backup
  activated=true
  link_release "$destination/backend" "$base/backend/current"
  sudo -n /usr/bin/systemctl restart zhiyu-backend.service
  healthy=false
  for attempt in {1..90}; do
    if curl -fsS --max-time 3 http://127.0.0.1:8080/actuator/health 2>/dev/null | grep -q '"status":"UP"'; then
      healthy=true
      break
    fi
    sleep 3
  done
  [[ "$healthy" == true ]] || { echo 'Backend did not become healthy'; exit 1; }
  curl -fsS --max-time 15 'http://127.0.0.1:8080/api/v1/knowposts/feed?page=1&size=1' -o /dev/null
fi
activated=true
link_release "$destination/frontend" "$base/frontend/current"
curl -fsS --max-time 15 -H 'Host: 113.20.8.115' http://127.0.0.1/ -o /dev/null
printf '%s\n' "$release" > "$base/DEPLOYED_REVISION"
trap - EXIT
rm -f "$incoming/release.tar.gz" "$incoming/release.tar.gz.sha256"
rmdir "$incoming"
# Retain recent releases, and always retain either currently active component.
mapfile -t old_releases < <(find "$base/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | tail -n +6 | cut -d' ' -f2-)
for old in "${old_releases[@]}"; do
  [[ "$old/backend" != "$(readlink "$base/backend/current")" && "$old/frontend" != "$(readlink "$base/frontend/current")" ]] || continue
  rm -rf -- "$old"
done
echo "Deployed $release"
