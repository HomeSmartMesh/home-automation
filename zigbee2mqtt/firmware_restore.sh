#!/usr/bin/env bash
set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

usage() {
  cat <<'EOF'
Usage: ./firmware_restore.sh PATH_TO_FIRMWARE.hex [--port PATH] [--baud BAUD]

Flashes coordinator firmware via TI ROM serial bootloader.

Requires `cc2538-bsl` (Python) to be installed.
  - pipx install cc2538-bsl
  - or: python3 -m pip install --user cc2538-bsl

IMPORTANT:
  - Flashing may wipe the coordinator's NVRAM (network data).
  - Take a coordinator backup first: ./coordinator_backup.sh
  - Then after flashing, restore: ./coordinator_restore.sh <coordinator_backup.json>

Env:
  Z2M_SYSTEMD_SERVICE  Override service name (default: zigbee2mqtt.service)
EOF
}

if [[ $# -lt 1 ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
  usage
  exit 1
fi

hex="$1"
shift
[[ -f "${hex}" ]] || die "firmware not found: ${hex}"

port=""
baud=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) port="${2:-}"; shift 2 ;;
    --baud) baud="${2:-}"; shift 2 ;;
    *) die "unknown arg: $1 (use --help)" ;;
  esac
done

require_cmd python3

data_dir="$(z2m_data_dir)"
if [[ -z "${port}" ]]; then
  if [[ -f "${data_dir}/configuration.yaml" ]]; then
    port="$(awk '$1=="port:"{print $2; exit}' "${data_dir}/configuration.yaml" || true)"
  fi
fi
[[ -n "${port}" ]] || die "could not determine serial port; pass --port /dev/ttyUSB0"

python_mod=(python3 -m cc2538_bsl.cc2538_bsl)
if ! "${python_mod[@]}" --help >/dev/null 2>&1; then
  die "cc2538-bsl not installed. Install with: pipx install cc2538-bsl"
fi

was_active=0
if service_is_active; then
  was_active=1
  echo "stopping $(z2m_service_name)..."
  stop_service
fi

echo "flashing ${hex} to ${port}"
cmd=("${python_mod[@]}" -p "${port}" -e -w -v)
if [[ -n "${baud}" ]]; then
  cmd+=(-b "${baud}")
fi
cmd+=("${hex}")
"${cmd[@]}"

echo "flash complete"

if [[ "${was_active}" -eq 1 ]]; then
  echo "starting $(z2m_service_name)..."
  start_service
fi

