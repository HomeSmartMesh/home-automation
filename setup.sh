#!/bin/bash
# -------- install docker if not available -------- 
## needed for docker-compose => mosquitto, influxdb, grafana
if [ -x "$(command -v docker)" ]; then
    echo "docker available"
else
    echo "Installing docker"
    sudo bash setup_docker.sh
    SCRIPT_REBOOT="yes"
fi
# -------- install docker-compose if not available -------- 
# needed for mosquitto, influxdb, grafana
if [ -x "$(command -v docker-compose)" ]; then
    echo "docker-compose available"
else
    echo "Installing docker-compose"
    sudo bash setup_docker-compose.sh
    SCRIPT_REBOOT="yes"
fi

# -------- install openthread if not available -------- 
# needed for thread_tags
if [ -x "$(command -v ot-ctl)" ]; then
    echo "openthread available"
else
    echo "Installing openthread"
    sudo bash setup_border_router.sh
    SCRIPT_REBOOT="yes"
fi

if ["$SCRIPT_REBOOT" == "yes"]; then
    echo "rebooting now - please run `sudo sh setup.sh` again after reboot"
    sudo reboot now
fi

sudo bash setup_thread_services.sh
