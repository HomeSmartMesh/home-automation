#!/usr/bin/env bash
set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

usage() {
  cat <<'EOF'
Usage: ./backup.sh [--no-stop] [--out PATH]

Backs up Zigbee2MQTT's `database.db` (device DB) only.

Env:
  Z2M_DATA_DIR     Override data dir (default: /opt/zigbee2mqtt/data if present, else ./data)
  Z2M_BACKUP_DIR   Override backup dir (default: ./backups)
  Z2M_SYSTEMD_SERVICE  Override service name (default: zigbee2mqtt.service)
EOF
}

no_stop=0
out=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-stop) no_stop=1; shift ;;
    --out) out="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown arg: $1 (use --help)" ;;
  esac
done

data_dir="$(z2m_data_dir)"
backup_dir="$(z2m_backup_dir)"

require_file "${data_dir}/database.db"
mkdir -p "${backup_dir}"

if [[ -z "${out}" ]]; then
  out="${backup_dir}/database.db.$(ts)"
fi

was_active=0
if [[ "${no_stop}" -eq 0 ]] && service_is_active; then
  was_active=1
  echo "stopping $(z2m_service_name) for a consistent snapshot..."
  stop_service
fi

cp -a "${data_dir}/database.db" "${out}"
echo "wrote ${out}"
sha256sum "${out}" | awk '{print "sha256 " $1}'

if [[ "${was_active}" -eq 1 ]]; then
  echo "starting $(z2m_service_name)..."
  start_service
fi

