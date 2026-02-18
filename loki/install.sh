#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CONFIG_SRC="${ROOT_DIR}/loki/config.yaml"
CONFIG_DST_DIR="/etc/loki"
CONFIG_DST="${CONFIG_DST_DIR}/config.yaml"
UNIT_SRC="${ROOT_DIR}/loki/loki.service"
UNIT_DST="/etc/systemd/system/loki.service"

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo $0" >&2
  exit 1
fi

command -v loki >/dev/null 2>&1 || {
  echo "WARN: /usr/bin/loki not found. Installing via apt (Grafana repo)" >&2
  if ! command -v curl >/dev/null 2>&1; then
    apt-get update && apt-get install -y curl
  fi
  install -m 0644 /dev/null /etc/apt/sources.list.d/grafana.list || true
  echo "deb https://apt.grafana.com stable main" >/etc/apt/sources.list.d/grafana.list
  curl -fsSL https://apt.grafana.com/gpg.key | gpg --dearmor -o /usr/share/keyrings/grafana.gpg
  apt-get update && apt-get install -y loki
}

mkdir -p "${CONFIG_DST_DIR}"
ln -sf "${CONFIG_SRC}" "${CONFIG_DST}"

install -m 0644 "${UNIT_SRC}" "${UNIT_DST}"
systemctl daemon-reload
systemctl enable --now loki
systemctl status --no-pager loki || true

echo "Loki installed/enabled. Config: ${CONFIG_DST}"
