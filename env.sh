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
    _raspi_http_ready "grafana" "http://127.0.0.1:3000/api/health"
    _raspi_http_ready "influxdb" "http://127.0.0.1:8086/health"
    _raspi_http_ready "zigbee2mqtt" "http://127.0.0.1:8030/"
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

firmware() {
    local action="${1:-}"
    shift || true

    local z2m_dir="${RASPI_HOME}/zigbee2mqtt"
    local fw_dir="${z2m_dir}/firmware"
    local fw_hex="${fw_dir}/coordinator.hex"

    local fw_tag="Z-Stack_3.x.0_coordinator_20250321"
    local fw_p_zip_url="https://github.com/Koenkk/Z-Stack-firmware/releases/download/${fw_tag}/CC1352P2_CC2652P_other_coordinator_20250321.zip"
    local fw_p_hex="CC1352P2_CC2652P_other_coordinator_20250321.hex"
    local fw_r_zip_url="https://github.com/Koenkk/Z-Stack-firmware/releases/download/${fw_tag}/CC2652R_coordinator_20250321.zip"
    local fw_r_hex="CC2652R_coordinator_20250321.hex"

    local _mm_was_active=0
    _firmware_stop_modemmanager() {
        if systemctl is-active --quiet ModemManager 2>/dev/null; then
            _mm_was_active=1
            echo "stopping ModemManager (can interfere with /dev/ttyUSB0)..."
            sudo systemctl stop ModemManager
        fi
    }

    _firmware_start_modemmanager() {
        if [[ "${_mm_was_active}" -eq 1 ]]; then
            echo "starting ModemManager..."
            sudo systemctl start ModemManager
            _mm_was_active=0
        fi
    }

    _firmware_usage() {
        cat >&2 <<'EOF'
usage:
  firmware flash
  firmware id
  firmware dump
  firmware download
  firmware select p|r

notes:
  - Firmware file flashed by default: zigbee2mqtt/firmware/coordinator.hex
  - "p" = CC1352P2/CC2652P (most USB dongles)
  - "r" = CC2652R
EOF
    }

    _firmware_need_cmd() {
        local cmd="$1"
        if ! command -v "${cmd}" >/dev/null 2>&1; then
            echo "error: missing required command: ${cmd}" >&2
            return 1
        fi
        return 0
    }

    _firmware_uv_sync() {
        _firmware_need_cmd uv || return 1

        if [[ -x "${z2m_dir}/.venv/bin/python" ]]; then
            if "${z2m_dir}/.venv/bin/python" -c 'import cc2538_bsl, intelhex' >/dev/null 2>&1; then
                return 0
            fi
        fi

        (cd "${z2m_dir}" && uv sync --extra firmware)
    }

    _firmware_download_variant() {
        local variant="$1"
        mkdir -p "${fw_dir}"
        _firmware_need_cmd curl || return 1
        _firmware_need_cmd unzip || return 1

        local zip_path hex_path url
        if [[ "${variant}" == "p" ]]; then
            url="${fw_p_zip_url}"
            zip_path="${fw_dir}/cc2652p.zip"
            hex_path="${fw_dir}/${fw_p_hex}"
        elif [[ "${variant}" == "r" ]]; then
            url="${fw_r_zip_url}"
            zip_path="${fw_dir}/cc2652r.zip"
            hex_path="${fw_dir}/${fw_r_hex}"
        else
            echo "error: unknown variant: ${variant}" >&2
            return 2
        fi

        if [[ -f "${hex_path}" ]]; then
            return 0
        fi

        echo "downloading ${url}"
        curl -fsSL -o "${zip_path}" "${url}"
        unzip -o "${zip_path}" -d "${fw_dir}" >/dev/null
        rm -f "${zip_path}" || true

        if [[ ! -f "${hex_path}" ]]; then
            echo "error: expected firmware hex not found after unzip: ${hex_path}" >&2
            return 1
        fi
    }

    _firmware_select_variant() {
        local variant="$1"
        _firmware_download_variant "${variant}" || return 1

        if [[ "${variant}" == "p" ]]; then
            cp -f "${fw_dir}/${fw_p_hex}" "${fw_hex}"
        else
            cp -f "${fw_dir}/${fw_r_hex}" "${fw_hex}"
        fi

        echo "selected firmware: ${fw_hex}"
    }

    case "${action}" in
        download)
            _firmware_download_variant p
            _firmware_download_variant r
            echo "downloaded into: ${fw_dir}"
            ;;
        id)
            _firmware_uv_sync || return 1
            echo "stopping zigbee2mqtt..."
            sudo systemctl stop zigbee2mqtt
            if systemctl is-active --quiet zigbee2mqtt; then
                echo "error: zigbee2mqtt is still running; cannot probe while it holds the serial port" >&2
                return 1
            fi
            _firmware_stop_modemmanager
            read -r -p "Put the dongle into BSL/bootloader mode, then press Enter..." _

            local requested_baud=""
            local passthrough=()
            while [[ $# -gt 0 ]]; do
                case "$1" in
                    --baud)
                        requested_baud="${2:-}"
                        passthrough+=("$1" "$2")
                        shift 2
                        ;;
                    *)
                        passthrough+=("$1")
                        shift
                        ;;
                esac
            done

            if [[ -n "${requested_baud}" ]]; then
                (cd "${z2m_dir}" && ./z2m firmware probe --no-stop "${passthrough[@]}")
                local rc=$?
                _firmware_start_modemmanager
                return "${rc}"
            fi

            local b rc=0
            for b in 500000 115200 1000000; do
                echo "trying bootloader baud ${b}..."
                (cd "${z2m_dir}" && ./z2m firmware probe --no-stop --baud "${b}" "${passthrough[@]}") && { _firmware_start_modemmanager; return 0; }
                rc=$?
            done
            _firmware_start_modemmanager
            return "${rc}"
            ;;
        dump)
            _firmware_uv_sync || return 1
            echo "stopping zigbee2mqtt..."
            sudo systemctl stop zigbee2mqtt
            if systemctl is-active --quiet zigbee2mqtt; then
                echo "error: zigbee2mqtt is still running; cannot read while it holds the serial port" >&2
                return 1
            fi
            _firmware_stop_modemmanager
            read -r -p "Put the dongle into BSL/bootloader mode, then press Enter..." _
            (cd "${z2m_dir}" && ./z2m firmware backup --no-stop "$@")
            local rc=$?
            _firmware_start_modemmanager
            return "${rc}"
            ;;
        select)
            local variant="${1:-}"
            if [[ "${variant}" != "p" && "${variant}" != "r" ]]; then
                _firmware_usage
                return 2
            fi
            _firmware_select_variant "${variant}"
            ;;
        flash)
            _firmware_uv_sync || return 1

            if [[ ! -f "${fw_hex}" ]]; then
                echo "note: ${fw_hex} is missing; defaulting to variant 'p' (CC1352P2/CC2652P)." >&2
                echo "      If you have a CC2652R, run: firmware select r" >&2
                _firmware_select_variant p || return 1
            fi

            echo "stopping zigbee2mqtt..."
            sudo systemctl stop zigbee2mqtt
            if systemctl is-active --quiet zigbee2mqtt; then
                echo "error: zigbee2mqtt is still running; cannot flash while it holds the serial port" >&2
                return 1
            fi
            _firmware_stop_modemmanager

            read -r -p "Put the dongle into BSL/bootloader mode, then press Enter..." _

            local rc=0
            (cd "${z2m_dir}" && ./z2m firmware flash --no-stop "$@") || rc=$?

            if [[ "${rc}" -eq 0 ]]; then
                echo
                echo "If Zigbee2MQTT can't reconnect after a flash, the dongle may need a power-cycle."
                read -r -p "Unplug/replug the dongle in normal mode (no button), then press Enter..." _
            fi

            echo "starting zigbee2mqtt..."
            sudo systemctl start zigbee2mqtt
            _firmware_start_modemmanager
            return "${rc}"
            ;;
        ""|-h|--help|help)
            _firmware_usage
            ;;
        *)
            echo "error: unknown firmware action: ${action}" >&2
            _firmware_usage
            return 2
            ;;
    esac
}
