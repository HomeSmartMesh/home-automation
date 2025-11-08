import datetime
import os
import math
from typing import OrderedDict
from influxdb_client import InfluxDBClient, Point, WritePrecision

import requests
import utils as utl
from dotenv import load_dotenv

load_dotenv()

client = None
config = None

def csv_to_posts(csv_file_name,main_measurement=""):
    header = True
    if not main_measurement:
        main_measurement = csv_file_name.split(".")[0]
    with open(csv_file_name, "r") as csv_file:
        posts = []
        for line in csv_file:
            line = line.replace('\n','')
            if(header):
                header = False
                columns = line.split(',')
                print(f"importing csv with columns: {columns}")
            else:
                cells = line.split(',')
                fields = {}
                measurement = ""
                time = 0
                skip_line = False
                for index,cell in enumerate(cells):
                    if(cell == "."):
                        skip_line = True
                        break
                    col_name = columns[index]
                    if(col_name == "name"):
                        measurement = cell
                    elif(col_name.lower() in ["time","date"]):
                        t = datetime.datetime.fromisoformat(cell)
                        time = math.trunc(t.timestamp()) # in seconds to be imported with 's' precision
                    else:
                        fields[col_name] = float(cell)
                if(skip_line):
                    continue
                if not measurement:
                    measurement = main_measurement
                posts.append(
                    {
                        "measurement": measurement,
                        "time": time,
                        "fields": fields
                    }
                )
        return posts

def export_influx_text(posts,fileName,dbName):
    with open(fileName, 'w', newline='\n') as efile:
        efile.write("# DDL\n")
        efile.write("\n")
        efile.write(f"CREATE DATABASE {dbName}\n")
        efile.write("\n")
        efile.write("# DML\n")
        efile.write("\n")
        efile.write(f"# CONTEXT-DATABASE: {dbName}\n")
        efile.write("\n")

        for post in posts:
            name = post["measurement"]
            name.replace(' ','\\ ')
            line = f"{name} "
            for filed_name,field_val in post["fields"].items():
                line = line + f"{filed_name}={field_val} "
            line = line + str(post["time"])
            efile.write(line+'\n')
    return

def handle_influx_exceptions():
    return

def drop_measurement(name):
    try:
        client.drop_measurement(name)
        print(f"measurement {name} dropped")
    except requests.exceptions.ConnectionError:
        print(f"injection failed: ConnectionError")
    except influxdb.exceptions.InfluxDBServerError:
        print(f"injection failed: InfluxDBServerError")
    except influxdb.exceptions.InfluxDBClientError as e:
        print(f"injection failed : InfluxDBClientError  '{str(e)}'" )
    return

def json_to_influx(fileName):
    data = utl.load_json(fileName)
    try:
        client.write_points(data,time_precision="s")
        print(f"{len(data)} measurements posted")
    except requests.exceptions.ConnectionError:
        print(f"injection failed: ConnectionError")
    except influxdb.exceptions.InfluxDBServerError:
        print(f"injection failed: InfluxDBServerError")
    except influxdb.exceptions.InfluxDBClientError as e:
        print(f"injection failed : InfluxDBClientError  '{str(e)}'" )
    return

def csv_to_influx(fileName,measurement_name):
    data = csv_to_posts(fileName,measurement_name)
    try:
        client.write_points(data,time_precision="s")
        print(f"{len(data)} measurements posted")
    except requests.exceptions.ConnectionError:
        print(f"injection failed: ConnectionError")
    except influxdb.exceptions.InfluxDBServerError:
        print(f"injection failed: InfluxDBServerError")
    except influxdb.exceptions.InfluxDBClientError as e:
        print(f"injection failed : InfluxDBClientError  '{str(e)}'" )
    return

def check_series(measurement):
    list_series = client.get_list_series(measurement=measurement)
    print(list_series)
    return

def get_count_info(res,measurement):
    result = client.query(f'select count(*) from "{measurement}"')
    for key,val in result.items():
        for row in val:
            for row_key,row_val in row.items():
                if(row_key != "time"):
                    print(f"  {row_key} = {row_val}")
                    if(row_key.startswith("count_")):
                        key_name = row_key[6:]
                        if key_name not in res:
                            res[key_name] = OrderedDict()
                        res[key_name]["count"] = row_val
    return res

def get_time_info(res,measurement,first=True):
    if(first):
        result = client.query(f'select * from "{measurement}" limit 1')
    else:
        result = client.query(f'select * from "{measurement}" order by time desc limit 1')
    for key,val in result.items():
        for row in val:
            for row_key,row_val in row.items():
                if(row_key == "time"):
                    if(first):
                        res["first"] = row_val
                    else:
                        res["last"] = row_val
    return res

def check_measurement(measurement):
    res = OrderedDict()
    res = get_time_info(res,measurement,True)
    res = get_time_info(res,measurement,False)
    res = get_count_info(res,measurement)
    return res

def check():
    res = OrderedDict()
    try:
        lists = client.get_list_measurements()
        for list_obj in lists:
            print(f"'{list_obj['name']}', ",end="")
        print("")
        print(f"measurements in '{config['db']}':")
        test_limit = 0
        for val in lists:
            #test_limit += 1
            if(test_limit == 2):
                break
            measurement = val["name"]
            print(f'- {measurement}')
            #check_series(measurement)
            res[measurement] = check_measurement(measurement)
    except requests.exceptions.ConnectionError:
        print(f"failed: ConnectionError")
    except influxdb.exceptions.InfluxDBServerError:
        print(f"failed: InfluxDBServerError")
    except influxdb.exceptions.InfluxDBClientError as e:
        print(f"failed : InfluxDBClientError  '{str(e)}'" )
    return res

def get_pandas(measurement):
    return client.query(f'select * from "{measurement}"')

def get_pandas_range(measurement,start,stop):
    return client.query(f'select * from "{measurement}" where time >= \'{start}\' and time < \'{stop}\'')

def get_measurements_list():
    if(client is None):
        create_client()
    res = []
    bucket = os.getenv("INFLUXDB_BUCKET", "mqtt")
    query = f'import "influxdata/influxdb/v1"\n' \
            f'v1.measurements(bucket: "{bucket}")'
    records = client.query_api().query_stream(query)
    lists = [{"name": r.get_value()} for r in records]
    for list_obj in lists:
        res.append(list_obj['name'])
    return res

def print_all():
    try:
        lists = client.get_list_measurements()
        for list_obj in lists:
            print(f"'{list_obj['name']}', ",end="")
        print("")
        print(f"measurements in '{config['db']}':")
        for val in lists:
            measurement = val["name"]
            print(f'- {measurement}')
            #list_series = client.get_list_series(measurement=measurement)
            result = client.query(f'select count(*) from {measurement}')
            for key,val in result.items():
                for row in val:
                    for row_key,row_val in row.items():
                        if(row_key != "time"):
                            print(f"  {row_key} = {row_val}")
    except requests.exceptions.ConnectionError:
        print(f"failed: ConnectionError")
    except influxdb.exceptions.InfluxDBServerError:
        print(f"failed: InfluxDBServerError")
    except influxdb.exceptions.InfluxDBClientError as e:
        print(f"failed : InfluxDBClientError  '{str(e)}'" )
    return

def create_client():
    global client
    client = InfluxDBClient(
        url=os.getenv("INFLUXDB_URL", "http://localhost:8086"),
        token=os.getenv("INFLUXDB_TOKEN"),
        org=os.getenv("INFLUXDB_ORG", "hsm")
    )

def create_pandas(conf):
    global client
    global config
    config = conf
    client = DataFrameClient( config["host"], 
                            config["port"], 
                            'root', 'root', 
                            config["db"])
