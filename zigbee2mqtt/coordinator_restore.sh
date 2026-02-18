#!/usr/bin/env bash
set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

usage() {
  cat <<'EOF'
Usage:
  ./coordinator_restore.sh PATH_TO_coordinator_backup.json
  ./coordinator_restore.sh PATH_TO_z2m-backup.zip

Restores Zigbee2MQTT's coordinator backup file (`coordinator_backup.json`) into
the Zigbee2MQTT data dir.

This does NOT overwrite `database.db` (device DB).

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
[[ -f "${src}" ]] || die "not found: ${src}"
require_cmd unzip

data_dir="$(z2m_data_dir)"
backup_dir="$(z2m_backup_dir)"
mkdir -p "${backup_dir}"

tmp="$(mktemp -t z2m-coordinator-restore.XXXXXX.json)"
cleanup() { rm -f "${tmp}"; }
trap cleanup EXIT

if [[ "${src}" == *.zip ]]; then
  unzip -p "${src}" coordinator_backup.json > "${tmp}" || die "zip does not contain coordinator_backup.json: ${src}"
else
  cp -f "${src}" "${tmp}"
fi

dest="${data_dir}/coordinator_backup.json"

was_active=0
if service_is_active; then
  was_active=1
  echo "stopping $(z2m_service_name)..."
  stop_service
fi

if [[ -f "${dest}" ]]; then
  safety="${backup_dir}/coordinator_backup.json.pre-restore.$(ts)"
  cp -a "${dest}" "${safety}"
  echo "saved current coordinator backup to ${safety}"
fi

cp -f "${tmp}" "${dest}"
if command -v chown >/dev/null 2>&1; then
  maybe_sudo chown --reference="${data_dir}" "${dest}" 2>/dev/null || true
fi
echo "restored ${dest} from ${src}"

if [[ "${was_active}" -eq 1 ]]; then
  echo "starting $(z2m_service_name)..."
  start_service
fi

