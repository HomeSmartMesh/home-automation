#!/usr/bin/env bash
set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

usage() {
  cat <<'EOF'
Usage: ./restore.sh PATH_TO_DATABASE_DB_BACKUP

Restores Zigbee2MQTT's `database.db` (device DB) only.

This stops Zigbee2MQTT, makes a safety copy of the current DB, restores the chosen
backup, and starts Zigbee2MQTT again if it was running.

Env:
  Z2M_DATA_DIR     Override data dir (default: /opt/zigbee2mqtt/data if present, else ./data)
  Z2M_BACKUP_DIR   Override backup dir (default: ./backups)
  Z2M_SYSTEMD_SERVICE  Override service name (default: zigbee2mqtt.service)
EOF
}

if [[ $# -ne 1 ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
  usage
  exit 1
fi

src="$1"
[[ -f "${src}" ]] || die "backup not found: ${src}"

data_dir="$(z2m_data_dir)"
backup_dir="$(z2m_backup_dir)"

mkdir -p "${backup_dir}"

dest="${data_dir}/database.db"

was_active=0
if service_is_active; then
  was_active=1
  echo "stopping $(z2m_service_name)..."
  stop_service
fi

if [[ -f "${dest}" ]]; then
  safety="${backup_dir}/database.db.pre-restore.$(ts)"
  cp -a "${dest}" "${safety}"
  echo "saved current DB to ${safety}"
fi

cp -f "${src}" "${dest}"
if command -v chown >/dev/null 2>&1; then
  maybe_sudo chown --reference="${data_dir}" "${dest}" 2>/dev/null || true
fi
echo "restored ${dest} from ${src}"

if [[ "${was_active}" -eq 1 ]]; then
  echo "starting $(z2m_service_name)..."
  start_service
fi

