# -------- install docker if not available -------- 
## needed for docker-compose => mosquitto, influxdb, grafana
if [ -x "$(command -v docker)" ]; then
    echo "docker available"
else
    echo "Installing docker"
    sudo sh setup_docker.sh
    sudo reboot now
fi
# -------- install docker-compose if not available -------- 
# needed for mosquitto, influxdb, grafana
if [ -x "$(command -v docker-compose)" ]; then
    echo "docker-compose available"
else
    echo "Installing docker-compose"
    sudo sh setup_docker-compose.sh
    sudo reboot now
fi

# -------- install openthread if not available -------- 
# needed for thread_tags
if [ -x "$(command -v ot-ctl)" ]; then
    echo "openthread available"
else
    echo "Installing openthread"
    sudo sh setup_border_router.sh
    sudo reboot now
fi

sudo sh setup_thread_services.sh
