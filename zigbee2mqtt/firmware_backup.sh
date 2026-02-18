#!/usr/bin/env bash
set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

usage() {
  cat <<'EOF'
Usage: ./firmware_backup.sh [--port PATH] [--out PATH] [--len BYTES] [--baud BAUD]

Attempts to read/backup the coordinator firmware flash via TI ROM serial bootloader.

Requires `cc2538-bsl` (Python) to be installed.
  - pipx install cc2538-bsl
  - or: python3 -m pip install --user cc2538-bsl

Notes:
  - Zigbee2MQTT must NOT be using the serial port during backup.
  - You may need to put the stick into bootloader mode (varies by zzh! revision).

Env:
  Z2M_SYSTEMD_SERVICE  Override service name (default: zigbee2mqtt.service)
EOF
}

port=""
out=""
len_bytes="360448"
baud=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) port="${2:-}"; shift 2 ;;
    --out) out="${2:-}"; shift 2 ;;
    --len) len_bytes="${2:-}"; shift 2 ;;
    --baud) baud="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown arg: $1 (use --help)" ;;
  esac
done

require_cmd python3

data_dir="$(z2m_data_dir)"
backup_dir="$(z2m_backup_dir)"
mkdir -p "${backup_dir}"

if [[ -z "${port}" ]]; then
  if [[ -f "${data_dir}/configuration.yaml" ]]; then
    port="$(awk '$1=="port:"{print $2; exit}' "${data_dir}/configuration.yaml" || true)"
  fi
fi
[[ -n "${port}" ]] || die "could not determine serial port; pass --port /dev/ttyUSB0"

if [[ -z "${out}" ]]; then
  out="${backup_dir}/firmware.$(ts).bin"
fi

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

echo "reading ${len_bytes} bytes from ${port} -> ${out}"
cmd=("${python_mod[@]}" -p "${port}" -r --len "${len_bytes}")
if [[ -n "${baud}" ]]; then
  cmd+=(-b "${baud}")
fi
cmd+=("${out}")
"${cmd[@]}"

echo "wrote ${out}"
sha256sum "${out}" | awk '{print "sha256 " $1}'

if [[ "${was_active}" -eq 1 ]]; then
  echo "starting $(z2m_service_name)..."
  start_service
fi

