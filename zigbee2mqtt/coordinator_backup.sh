#!/usr/bin/env bash
set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

usage() {
  cat <<'EOF'
Usage: ./coordinator_backup.sh

Creates a coordinator/network backup (for firmware upgrades).

Primary method: asks Zigbee2MQTT (via MQTT) to create a backup zip (includes
`coordinator_backup.json`), and saves it under `./backups/`.

Fallback: if MQTT request fails, copies the existing `coordinator_backup.json`
from the Zigbee2MQTT data dir (if present).

Env:
  Z2M_DATA_DIR     Override data dir (default: /opt/zigbee2mqtt/data if present, else ./data)
  Z2M_BACKUP_DIR   Override backup dir (default: ./backups)
  Z2M_SYSTEMD_SERVICE  Override service name (default: zigbee2mqtt.service)
  NODE_PATH        If Zigbee2MQTT isn't in /opt, point this to its node_modules
EOF
}

if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

require_cmd node

data_dir="$(z2m_data_dir)"
backup_dir="$(z2m_backup_dir)"
mkdir -p "${backup_dir}"

stamp="$(ts)"
out_dir="${backup_dir}/coordinator-${stamp}"
mkdir -p "${out_dir}"

zip_out="${out_dir}/z2m-backup.zip"
config_path="${data_dir}/configuration.yaml"

if [[ -f "${config_path}" ]]; then
  echo "requesting backup via MQTT (this requires Zigbee2MQTT + MQTT broker running)..."
  set +e
  NODE_PATH="${NODE_PATH:-/opt/zigbee2mqtt/node_modules}" \
    node "${repo_dir}/z2m_request_backup.js" --config "${config_path}" --out "${zip_out}" --timeout-ms 45000
  rc=$?
  set -e
  if [[ "${rc}" -eq 0 ]]; then
    echo "wrote ${zip_out}"
  else
    echo "warning: MQTT backup request failed (rc=${rc}); falling back to copying coordinator_backup.json if present" >&2
    rm -f "${zip_out}" || true
  fi
else
  echo "warning: missing ${config_path}; skipping MQTT backup request" >&2
fi

if [[ -f "${data_dir}/coordinator_backup.json" ]]; then
  cp -a "${data_dir}/coordinator_backup.json" "${out_dir}/coordinator_backup.json"
  echo "copied ${data_dir}/coordinator_backup.json -> ${out_dir}/coordinator_backup.json"
else
  echo "warning: no ${data_dir}/coordinator_backup.json present to copy" >&2
fi

if [[ -f "${data_dir}/database.db" ]]; then
  cp -a "${data_dir}/database.db" "${out_dir}/database.db"
  echo "copied ${data_dir}/database.db -> ${out_dir}/database.db"
fi

if [[ -f "${data_dir}/configuration.yaml" ]]; then
  cp -a "${data_dir}/configuration.yaml" "${out_dir}/configuration.yaml"
  echo "copied ${data_dir}/configuration.yaml -> ${out_dir}/configuration.yaml"
fi

echo "backup folder: ${out_dir}"

