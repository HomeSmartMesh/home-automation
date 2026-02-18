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

_raspi_http_ready() {
    local name="$1"
    local url="$2"

    if ! command -v curl >/dev/null 2>&1; then
        printf "%-20s %s\n" "${name}" "no-curl"
        return 0
    fi

    if curl -fsS -m 2 "${url}" >/dev/null 2>&1; then
        printf "%-20s %s\n" "${name}" "ok"
    else
        printf "%-20s %s\n" "${name}" "fail"
    fi
}

check() {
    local service

    echo "Systemd:"
    for service in "${RASPI_SYSTEMD_SERVICES[@]}"; do
        _raspi_print_service_status "${service}"
    done

    echo
    echo "Health:"
    _raspi_http_ready "loki" "http://127.0.0.1:3100/ready"
    _raspi_http_ready "promtail" "http://127.0.0.1:9080/ready"
}

# Show listening ports for services in RASPI_SYSTEMD_SERVICES.
ports() {
    local ss_cmd="ss -H -tulpen"
    local ss_out

    # Capture socket list; if no process details present, retry with sudo.
    ss_out="$($ss_cmd 2>/dev/null || true)"
    if ! grep -qE 'pid=|cgroup:' <<<"${ss_out}" 2>/dev/null; then
        if command -v sudo >/dev/null 2>&1; then
            ss_out="$(sudo $ss_cmd 2>/dev/null || true)"
        fi
    fi

    local service
    for service in "${RASPI_SYSTEMD_SERVICES[@]}"; do
        local pid matches acc=""

        # Prefer matching by cgroup unit name if available in ss output
        matches="$(awk -v svc="${service}" 'index($0, "cgroup:") && index($0, "/" svc ".service") {print}' <<<"${ss_out}")"

        if [[ -z "${matches}" ]]; then
            # Fallback: match by MainPID
            pid="$(systemctl show -p MainPID --value "${service}" 2>/dev/null || true)"
            if [[ -n "${pid}" && "${pid}" != "0" ]]; then
                matches="$(awk -v p="${pid}" 'index($0, "pid=" p ",")>0' <<<"${ss_out}")"
            fi
        fi

        if [[ -z "${matches}" ]]; then
            printf "%-20s -\n" "${service}"
            continue
        fi

        while IFS= read -r line; do
            [[ -z "${line}" ]] && continue
            local proto localaddr port item
            proto="$(awk '{print $1}' <<<"${line}")"
            localaddr="$(awk '{print $5}' <<<"${line}")"
            port="$(sed -E 's/.*:([0-9*]+)$/\1/' <<<"${localaddr}")"
            item="${proto}/${port}"
            if [[ ",${acc}," != *",${item},"* ]]; then
                if [[ -z "${acc}" ]]; then acc="${item}"; else acc="${acc}, ${item}"; fi
            fi
        done <<<"${matches}"

        [[ -z "${acc}" ]] && acc="-"
        printf "%-20s %s\n" "${service}" "${acc}"
    done
}

install() {
    local svc="$1"
    if [[ -z "${svc}" ]]; then
        echo "usage: install <service>" >&2
        return 2
    fi

    local svc_dir="${RASPI_HOME}/${svc}"
    if [[ ! -d "${svc_dir}" ]]; then
        echo "Unknown service directory: ${svc_dir}" >&2
        return 1
    fi

    # Optional pre-install hook for service-specific steps (e.g., apt repo install).
    # Use either `<service>/install` or `<service>/install.sh` if present.
    if [[ -x "${svc_dir}/install" ]]; then
        sudo "${svc_dir}/install"
    elif [[ -x "${svc_dir}/install.sh" ]]; then
        sudo "${svc_dir}/install.sh"
    elif [[ -f "${svc_dir}/install.sh" ]]; then
        sudo bash "${svc_dir}/install.sh"
    fi

    # Generic config link convention: `<service>/config.yaml` -> `/etc/<service>/config.yaml`
    local src_cfg="${svc_dir}/config.yaml"
    local etc_dir="/etc/${svc}"
    local etc_cfg="${etc_dir}/config.yaml"
    if [[ -f "${src_cfg}" ]]; then
        sudo mkdir -p "${etc_dir}"
        sudo ln -sf "${src_cfg}" "${etc_cfg}"
    fi

    # Generic unit install convention: `<service>/<service>.service`
    local unit_src="${svc_dir}/${svc}.service"
    local unit_dst="/etc/systemd/system/${svc}.service"
    if [[ -f "${unit_src}" ]]; then
        sudo install -m 0644 "${unit_src}" "${unit_dst}"
        sudo systemctl daemon-reload
        sudo systemctl enable --now "${svc}"
        sudo systemctl status --no-pager "${svc}" || true
    else
        echo "Unit file not found: ${unit_src} (skipping systemd wiring)" >&2
    fi
}

# Apply config and restart known services. Usage: `config loki` or `config promtail`.
config() {
    local svc="$1"
    if [[ -z "${svc}" ]]; then
        echo "usage: config <service>" >&2
        return 2
    fi

    local svc_dir="${RASPI_HOME}/${svc}"

    # Optional pre-config hook for service-specific steps
    if [[ -x "${svc_dir}/config" ]]; then
        sudo "${svc_dir}/config"
    elif [[ -x "${svc_dir}/config.sh" ]]; then
        sudo "${svc_dir}/config.sh"
    elif [[ -f "${svc_dir}/config.sh" ]]; then
        sudo bash "${svc_dir}/config.sh"
    fi

    local src="${svc_dir}/config.yaml"
    local dstDir="/etc/${svc}"
    local dst="${dstDir}/config.yaml"

    if [[ ! -f "${src}" ]]; then
        echo "Config source not found: ${src}" >&2
        return 1
    fi

    sudo mkdir -p "${dstDir}"
    sudo ln -sf "${src}" "${dst}"
    # Restart service if unit exists; otherwise just link config
    if systemctl list-unit-files | grep -q "^${svc}\.service"; then
        sudo systemctl restart "${svc}"
        sudo systemctl status --no-pager "${svc}" || true
    else
        echo "No systemd unit found for ${svc}; linked config only." >&2
    fi
}
