#!/bin/bash
echo "Backing up the influx Databse"
influxd backup /home/wass/share/mqtt_db_backup/$(date +%F)_influx_backup
influxd backup -database mqtt -since 2017-12-01T00:00:00Z /home/wass/share/mqtt_db_backup/$(date +%F)_influx_backup
#TODO import test on windows