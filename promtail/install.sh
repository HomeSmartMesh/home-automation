#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CONFIG_SRC="${ROOT_DIR}/promtail/config.yaml"
CONFIG_DST_DIR="/etc/promtail"
CONFIG_DST="${CONFIG_DST_DIR}/config.yaml"
UNIT_SRC="${ROOT_DIR}/promtail/promtail.service"
UNIT_DST="/etc/systemd/system/promtail.service"

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo $0" >&2
  exit 1
fi

command -v promtail >/dev/null 2>&1 || {
  echo "INFO: /usr/bin/promtail not found. Installing via Grafana apt repo" >&2
  if ! command -v curl >/dev/null 2>&1; then
    apt-get update && apt-get install -y curl
  fi
  install -d -m 0755 /usr/share/keyrings
  curl -fsSL https://apt.grafana.com/gpg.key | gpg --dearmor -o /usr/share/keyrings/grafana.gpg
  printf '%s\n' "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://apt.grafana.com stable main" \
    > /etc/apt/sources.list.d/grafana.list
  apt-get update
  apt-get install -y promtail
}

# Verify binary exists after attempted install
if ! command -v promtail >/dev/null 2>&1; then
  echo "ERROR: promtail binary still not found after installation attempt. Check apt output and repo key." >&2
  exit 1
fi

mkdir -p "${CONFIG_DST_DIR}"
ln -sf "${CONFIG_SRC}" "${CONFIG_DST}"

install -m 0644 "${UNIT_SRC}" "${UNIT_DST}"
systemctl daemon-reload
systemctl enable --now promtail
systemctl status --no-pager promtail || true

echo "Promtail installed/enabled. Config: ${CONFIG_DST}"
