influxd restore -db mqtt /home/pi/share/2021-12-23_influx_backup/

wass@salon:~$ sudo influxd restore -metadir /var/lib/influxdb/meta /home/wass/share/backup_lifo/
Using metastore snapshot: /home/wass/share/backup_lifo/meta.01

wass@salon:~$ sudo influxd restore -db nrf_mesh -newdb nrf_mesh -datadir /var/lib/influxdb/data /home/wass/share/backup_lifo/
2022/02/06 15:57:13 Restoring offline from backup /home/wass/share/backup_lifo/nrf_mesh.*

sudo chown -R influxdb:influxdb /var/lib/influxdb
