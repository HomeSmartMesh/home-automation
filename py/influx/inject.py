from influxdb import InfluxDBClient
import influxdb
import requests
import datetime
import logging as log
import cfg
from time import sleep
import socket
import json
import dateutil.parser
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# -------------------- mqtt events -------------------- 
def mqtt_on_message(client, userdata, msg):
    topic_parts = msg.topic.split('/')
    try:
        nodeid = topic_parts[1]
        sensor = topic_parts[2]
        measurement = "node"+nodeid
        value = float(str(msg.payload))
        post = [
            {
                "measurement": measurement,
                "time": datetime.datetime.utcnow(),
                "fields": {
                    sensor: value
                }
            }
        ]
        try:
            clientDB.write_points(post)
            log.debug(msg.topic+" "+str(msg.payload)+" posted")
        except requests.exceptions.ConnectionError:
            log.error("ConnectionError sample skipped "+msg.topic)
        except influxdb.exceptions.InfluxDBServerError:
            log.error("InfluxDBServerError sample skipped "+msg.topic)
        except influxdb.exceptions.InfluxDBClientError as e:
            log.error("InfluxDBClientError with "+msg.topic+" : " +str(msg.payload)+" >>> "+str(e) )
    except:
        e = sys.exc_info()[0]
        log.info( "<p>Error: %s</p>" % e )
# -------------------- main -------------------- 
config = cfg.configure_log(__file__)

# -------------------- influxDB client -------------------- 
clientDB = InfluxDBClient(    config["influxdb"]["host"], 
                            config["influxdb"]["port"], 
                            'root', 'root', 
                            config["influxdb"]["db"])

csv_file = sys.argv[1]

df = pd.read_csv(csv_file,
                    index_col="time", 
                    squeeze=True ,
                    date_parser=lambda ts:pd.to_datetime(int(ts) // 1000, unit="us")
                )

modif_range = df["2020-06-13":"2020-06-14"]

modif_range.plot()
