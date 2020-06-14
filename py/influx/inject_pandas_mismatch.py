from influxdb import InfluxDBClient
import influxdb
import requests
from datetime import datetime
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


def inject(df):
    for index, row in df.iterrows():
        print(f"name = {row['name']} ; index= {index} ; timestamp={pd.Timestamp(index)}")
        for field_name,field_val in row.items():
            if(field_name != "name"):
                print(f"field:{field_name} = {field_val}")
# -------------------- mqtt events -------------------- 
def inject_(data):
    for index, row in df.iterrows():
        measurement = row["name"]
        fields = {}
        for field_name,field_val in row.items():
            if(field_name != "name"):
                fields[field_name] = field_val
        try:
            post = [
                {
                    "measurement": measurement,
                    "time": index,
                    "fields": fields
                }
            ]
            try:
                clientDB.write_points(post)
                log.debug(f"{measurement} @ {index} posted")
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

#csv_file = "D:\\Dev\\HomeSmartMesh\\kitchen_voltage.csv"
csv_file = sys.argv[1]

df = pd.read_csv(csv_file,
                    index_col="time", 
                    squeeze=True ,
                    date_parser=lambda ts:pd.to_datetime(int(ts) // 1000, unit="us")
                )

modif_range = df["2020-06-13":"2020-06-14"]

inject(modif_range)

#influx -database 'test' -execute 'SELECT "voltage" FROM "kitchen tag"'
