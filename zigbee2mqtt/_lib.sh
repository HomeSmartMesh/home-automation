#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd -- "${script_dir}" && pwd)"

z2m_data_dir() {
  if [[ -n "${Z2M_DATA_DIR:-}" ]]; then
    printf '%s\n' "${Z2M_DATA_DIR}"
    return 0
  fi

  if [[ -d /opt/zigbee2mqtt/data ]]; then
    printf '%s\n' /opt/zigbee2mqtt/data
    return 0
  fi

  printf '%s\n' "${repo_dir}/data"
}

z2m_backup_dir() {
  if [[ -n "${Z2M_BACKUP_DIR:-}" ]]; then
    printf '%s\n' "${Z2M_BACKUP_DIR}"
    return 0
  fi

  printf '%s\n' "${repo_dir}/backups"
}

z2m_service_name() {
  printf '%s\n' "${Z2M_SYSTEMD_SERVICE:-zigbee2mqtt.service}"
}

ts() {
  date +"%Y%m%d-%H%M%S"
}

die() {
  echo "error: $*" >&2
  exit 1
}

require_file() {
  local path="$1"
  [[ -f "${path}" ]] || die "missing file: ${path}"
}

require_cmd() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || die "missing command: ${cmd}"
}

maybe_sudo() {
  if [[ "${EUID}" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    "$@"
  fi
}

service_is_active() {
  systemctl is-active --quiet "$(z2m_service_name)"
}

stop_service() {
  maybe_sudo systemctl stop "$(z2m_service_name)"
}

start_service() {
  maybe_sudo systemctl start "$(z2m_service_name)"
}

restart_service() {
  maybe_sudo systemctl restart "$(z2m_service_name)"
}

