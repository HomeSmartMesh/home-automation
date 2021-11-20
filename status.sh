check_service () {
    STATUS="$(systemctl is-active $1)"
    if [ "${STATUS}" = "active" ]; then
        echo "$1 is running"
    else 
        echo "$1 is dead"  
    fi
}

check_service "nrf_mesh"
check_service "hue"
check_service "telegraf"
check_service "zigbee2mqtt"
check_service "bathroom"
check_service "influx_mqtt"
check_service "lifx"
check_service "roll"
check_service "watch_bots"
check_service "heat_cut"
check_service "home_status"
check_service "pc_power"
check_service "lapse"

#check now the Docker Compose containers
dc ps
