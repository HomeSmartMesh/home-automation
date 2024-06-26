# influx 2 mqtt influx_client.py

## install dependencies

    sudo /usr/bin/python3 -m pip install -r requirements.txt

## init secret
create `.env` file with INFLUXDB_TOKEN created with write access to the bucket defined in config

### run as a service

```bash
cd /lib/systemd/system/
sudo cp /home/pi/raspi/py/influx/influx_mqtt.service .
sudo chmod 644 /lib/systemd/system/influx_mqtt.service
chmod +x /home/pi/raspi/py/influx/influx_client.py
sudo systemctl daemon-reload
sudo systemctl enable influx_mqtt.service
sudo systemctl start influx_mqtt.service
sudo systemctl stop influx_mqtt.service
```

# delete a measurement
list org id
```bash
influx org list --token=''
```

```bash
influx delete --bucket=mqtt \
  --start='1970-01-01T00:00:00Z' \
  --stop='2023-06-11T20:10:00Z' \
  --predicate='_measurement="state"'\
  --org-id='ID-16-bytes'\
  --token=''
```

```bash
influx delete --bucket mqtt --org hsm --predicate '_measurement="env" AND name="office air"' --start '1970-01-01T00:00:00Z' --stop '2025-01-01T00:00:00Z'
```

# influxDB
## influx queries examples

    SELECT "temperature" FROM "node91" WHERE $timeFilter


    SELECT mean("battery") FROM "node78" WHERE $timeFilter GROUP BY time(3h)
    SELECT mean("battery") FROM "node78" WHERE $timeFilter GROUP BY time(24h)


    Show Field Keys
    drop MEASUREMENT "motion button"

## Install on the Raspberry pi
sources:
- https://gist.github.com/boseji/bb71910d43283a1b84ab200bcce43c26
- https://docs.influxdata.com/influxdb/v1.4/introduction/getting_started/
- https://github.com/influxdata/influxdb/blob/master/QUERIES.md

```
sudo apt install apt-transport-https
echo "deb https://repos.influxdata.com/debian stretch stable" | sudo tee /etc/apt/sources.list.d/influxdb.list
sudo apt-get update

sudo apt-get install influxdb

```

### config
Default
```
sudo nano /etc/influxdb/influxdb.conf
```
directly from the repo
```
INFLUXDB_CONFIG_PATH=/home/pi/IoT_Frameworks/config/influxdb/influxdb.conf
```

### start the service
```
sudo systemctl start influxdb
```

### help reminder, see getting started link for more
```
influx -precision rfc3339
CREATE DATABASE mydb,
SHOW DATABASES
SHOW SERIES on raspiStatus
USE mydb

DROP DATABASE mydb

cpu,host=serverA,region=us_west value=0.64

SHOW FIELD KEYS FROM "cpu_temp"
SHOW TAG KEYS FROM "cpu_temp"
SHOW TAG VALUES FROM "cpu_temp" WITH KEY="host"

SELECT * FROM "cpu_temp" WHERE "host" = 'ioserv'

SELECT "power" FROM "node30" WHERE time > '2017-12-24T12:33:00Z' AND time < '2017-12-24T15:34:10Z'
DELETE FROM "node37" WHERE time > '2017-12-24T12:33:00Z' AND time < '2017-12-24T15:34:10Z'


SELECT "temperature" FROM "livingroom window tag" WHERE time > '2021-07-25T05:00:00Z' AND time < '2021-07-25T05:01:00Z'
DELETE FROM "livingroom window tag" WHERE time > '2021-07-25T05:00:00Z' AND time < '2021-07-25T05:01:00Z'
```
### Nodes posts
```
post = [
    {
        "measurement": "node6",
        "time": datetime.datetime.utcnow(),
        "fields": {
            "temperature": value
        }
    }
]
```
### Grafana Queries
```
SELECT "temperature" FROM "node6" WHERE $timeFilter
```
### Raspi status posts
```
posts = [
    {
        "measurement": "cpu_load",
        "time": tnow,
        "tags":{
            "host":hostname
        },
        "fields": {
            "value": float(rasp.getCPU_Avg1min())
        }
    }
]
```

### Raspi queries
```
SELECT "value" FROM "cpu_load"
```

### purse wrong data types

    >influx
    use meshNodes
    SHOW SERIES
    SHOW FIELD KEYS FROM "entrance light"
    SELECT "battery" FROM "entrance light"
    
    DELETE FROM "entrance light" WHERE time > 1543760602123951871 AND time < 1546526296817206017

does not drop the types

    DROP MEASUREMENT "bed weather"

    SHOW FIELD KEYS FROM "entrance light"

drops the types, but still present after exit and return

    DELETE from "entrance light" where time > 0

drops the types permanently
    DROP SERIES FROM "entrance light"

does not work :

    drop series from "bed weather" where battery='100.00';
    delete series from "bed weather" where battery='100.00';

step:
* retrieve measurements
* modify
* re-insert

# first and last

    select battery from "bedroom roll" limit 5
    select battery from "bedroom roll" order by time desc limit 5

