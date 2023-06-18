import os
import sys
import paho.mqtt.client as mqtt
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
import requests
import datetime
import logging as log
import cfg
from time import sleep
import socket
import json
from mqtt import mqtt_start
import dateutil.parser
from dotenv import load_dotenv
import utils as utl

def name_room(name):
    text = name.lower()
    for name,room_list in devices["rooms"].items():
        if(text in room_list):
            return name
    if("living" in text):
        return "livingroom"
    elif("office" in text):
        return "office"
    elif("bath" in text):
        return "bathroom"
    elif("bed" in text):
        return "bedroom"
    elif("kitchen" in text):
        return "kitchen"
    elif("hall" in text):
        return "hallway"
    elif("balcony" in text):
        return "balcony"
    return None

def name_device_model(model):
    text = model.lower()
    for model,models_list in devices["models"].items():
        if(text in models_list):
            return model
    return None

def add_room(data_point):
    name = data_point["tags"]["name"]
    room = name_room(name)
    if(room is not None):
        data_point["tags"]["room"] = room
    return

def add_device_model(data_point):
    name = data_point["tags"]["name"]
    device_model = name_device_model(name)
    if(device_model is not None):
        data_point["tags"]["model"] = device_model
    return

def set_type(fields,param,set_type):
    if(param in fields):
        if(set_type == "float"):
            fields[param] = float(fields[param])
        elif(set_type == "int"):
            fields[param] = int(fields[param])
        elif(set_type == "bool"):
            fields[param] = bool(fields[param])
        elif(set_type == "boolstring"):
            if(fields[param].lower in ["on","true","1"]):
                fields[param] = True
            elif(fields[param].lower in ["off","false","0"]):
                fields[param] = False
            else:
                del fields[param]
        else:
            log.error(f"unknown type {set_type}")
    return

def check_all_types(fields):
    for type_name,type_val in devices["allowed_fields"].items():
        set_type(fields,type_name,type_val)
    return

def check_allowed_fields(fields):
    for key in list(fields.keys()):
        if (fields[key] is None):
            del fields[key]
        if(key not in list(devices["allowed_fields"].keys())):
            del fields[key]
    return
def last_seen_fresh(last_seen_text):
    last_seen_time = dateutil.parser.parse(last_seen_text).replace(tzinfo=None)
    diff = datetime.datetime.now() - last_seen_time
    if(diff.total_seconds() > 2):
        return False
    else:
        return True

def check_last_seen_discard(fields,name):
    is_last_seen_relevant = False
    if("last_seen" in fields):
        is_last_seen_relevant = True
        last_seen = fields["last_seen"]
        del fields["last_seen"]
        is_last_seen_fresh = last_seen_fresh(last_seen)
    if(is_last_seen_relevant) and (not is_last_seen_fresh):
        log.info("postdiscarded from "+name+" last seen at "+last_seen)
    return is_last_seen_relevant

def object_to_text(data):
    point = data["measurement"]
    if("tags" in data):
        point += ","
        for key,tag in data["tags"].items():
            tag = tag.replace(" ","\ ").replace(",","\,").replace("=","\=")
            point += f"{key}={tag},"
        point = point[:-1]
    point += " "
    for key,field in data["fields"].items():
        point += f"{key}={field},"
    point = point[:-1]
    return point

def post_message(point,topic):
    try:
        record = object_to_text(point)
        write_api.write(bucket=bucket, org=org, record=record)
        log.debug(f"{topic} posted '{record}'")
    except requests.exceptions.ConnectionError:
        log.error("ConnectionError sample skipped "+topic)
    except Exception as e:
        log.error(e)
    #except influxdb.exceptions.InfluxDBClientError as e:
    #    log.error("InfluxDBClientError with "+topic+" : " +payload+" >>> "+str(e) )
    return


def construct_shellies(topic,payload):
    data_point = None
    if(topic in devices["friendly_names"]["topics"]):
        topic_parts = topic.split('/')
        sensor = topic_parts[4]
        value = float(payload)
        name = devices["friendly_names"]["topics"][topic]
        data_point = {
                "measurement": "socket",
                "tags":{
                    "group":"shellies",
                    "name":name
                },
                "fields": {
                    sensor: value
                }
            }
    return data_point

def construct_nrf(topic_parts,payload):
    data_point = None
    name = topic_parts[1]
    fields = json.loads(payload)
    check_allowed_fields(fields)
    check_all_types(fields)
    if(check_last_seen_discard(fields,name)):
        return
    if("temperature" in fields):
        data_point = {
                "measurement": "weather",
                "fields": fields
            }
    elif("light" in fields):
        data_point = {
                "measurement": "light",
                "fields": {"ambient":fields["light"]}
            }
    elif("alive_count" in fields):
        data_point = {
                "measurement": "state",
                "fields": fields
            }
    elif("voltage" in fields):
        data_point = {
                "measurement": "state",
                "fields": fields
            }
    elif("rssi" in fields):
        data_point = {
                "measurement": "network",
                "fields": fields
            }
    else:
        print("unknown fields")
        print(fields)
        return
    data_point["tags"] = {
        "name":name,
        "group":topic_parts[0],
    }
    return data_point

def construct_thread_tags(topic_parts,payload):
    data_point = None
    name = topic_parts[1]
    fields = json.loads(payload)
    check_allowed_fields(fields)
    check_all_types(fields)
    if(check_last_seen_discard(fields,name)):
        return
    if(len(topic_parts) == 3):
        measurement = topic_parts[2]
    else:
        measurement = "ambient"#all in one so no specific measurement
    data_point = {
            "measurement"   : measurement,
            "tags":{
                "group"         :topic_parts[0],
                "name"        :topic_parts[1],
            },
            "fields"        :fields
        }
    return data_point

def construct_lzig(topic_parts,payload):
    if(len(topic_parts) != 2):
        return
    data_point = None
    name = topic_parts[1]
    fields = json.loads(payload)
    check_allowed_fields(fields)
    check_all_types(fields)
    if(check_last_seen_discard(fields,name)):
        return
    if("temperature" in fields):
        measurement = "weather"
    elif("current" in fields):
        measurement = "socket"
    elif("current_heating_setpoint" in fields):
        measurement = "heating"
    elif("linkquality" in fields):
        measurement = "network"
    else:
        return None
    data_point = {
            "measurement": measurement,
            "fields": fields,
            "tags":{
                "group"         :topic_parts[0],
                "name"        :topic_parts[1],
            },
        }
    return data_point

def construct_generic(topic_parts,payload):
    if(len(topic_parts) != 2):
        return
    data_point = None
    name = topic_parts[1]
    fields = json.loads(payload)
    check_allowed_fields(fields)
    check_all_types(fields)
    if(check_last_seen_discard(fields,name)):
        return
    data_point = {
            "measurement": name,
            "fields": fields,
            "tags":{
                "group"         :topic_parts[0],
                "name"        :topic_parts[1],
            },
        }
    return data_point

# -------------------- mqtt events -------------------- 
def mqtt_on_message(client, userdata, msg):
    topic_parts = msg.topic.split('/')
    try:
        post = None
        payload = msg.payload.decode('utf-8')
        if(topic_parts[0] == "shellies"):
            post = construct_shellies(msg.topic,payload)
        elif(topic_parts[0] == "nrf"):
            post = construct_nrf(topic_parts,payload)
        elif(topic_parts[0] == "thread_tags"):
            post = construct_thread_tags(topic_parts,payload)
        elif(topic_parts[0] == "lzig"):
            post = construct_lzig(topic_parts,payload)
        else:
            post = construct_generic(topic_parts,payload)
        if(post != None):
            add_room(post)
            add_device_model(post)
            post_message(post,msg.topic)
    except:
        log.exception("message")

# -------------------- main -------------------- 
load_dotenv()
config = cfg.configure_log(__file__)
root_path = os.path.join(os.path.dirname(__file__),"../..")

devices = utl.load_yaml(os.path.join(root_path,"devices.yaml"))
# -------------------- influxDB client -------------------- 
bucket = config["influxdb"]["bucket"]
org = config["influxdb"]["org"]
write_client = InfluxDBClient(  url=config["influxdb"]["url"],
                            token=os.getenv("INFLUXDB_TOKEN"),
                            org=org)
write_api = write_client.write_api(write_options=SYNCHRONOUS)

# -------------------- Mqtt Client -------------------- 
#will start a separate thread for looping
clientMQTT = mqtt_start(config,mqtt_on_message,True)

while(True):
    sleep(10)
    #The MQTT keeps looping on a thead
    #All there is to do here is not to exit
