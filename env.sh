#!/usr/bin/env bash

if [[ -z "${RASPI_HOME:-}" ]]; then
    echo "RASPI_HOME must be set before sourcing env.sh" >&2
    return 1 2>/dev/null || exit 1
fi

# Services taken from services.yaml/used; adjust when that file changes.
RASPI_SYSTEMD_SERVICES=(
    thread_tags
    heat_cut
    influx_mqtt
    bathroom
    hue
    zigbee2mqtt
    pc_power
    influxdb
    mosquitto
    grafana-server
    loki
    promtail
)

_raspi_print_service_status() {
    local service="$1"
    local status
    local rc=0

    status="$(systemctl is-active "${service}" 2>/dev/null)" || rc=$?
    if [[ ${rc} -ne 0 && -z "${status}" ]]; then
        status="not-found"
    fi

    printf "%-20s %s\n" "${service}" "${status}"
}

check() {
    local service

    for service in "${RASPI_SYSTEMD_SERVICES[@]}"; do
        _raspi_print_service_status "${service}"
    done
}
