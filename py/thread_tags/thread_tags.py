import paho.mqtt.client as mqtt
import socket 
import logging as log
import cfg
from mqtt import mqtt_start
import time
import json

UDP_IP = "::" # = 0.0.0.0 u IPv4
UDP_PORT = 4242

def generate_config_payload(uid, device_class, valuetag, unit_of_measurement):
    #{"alive":8589,"voltage":3.245,"light":2266.726,"temperature":-0.56,"humidity":59.12,"pressure":1027.39}
    return {
        "name": "TST-["+uid+"]("+device_class+")",
        "obj_id": "tst_"+uid+"_"+valuetag,
        "~": "homeassistant/sensor/"+uid,
        "uniq_id": uid+"#"+valuetag,
        "state_topic": "~/state",
        "unit_of_measurement": unit_of_measurement,
        "device_class": device_class,
        "value_template": "{{ value_json."+valuetag+" }}",
        "force_update": True,
        "device": {
            "identifiers": [
                str(uid)
            ],
            "manufacturer": "open-things.de",
            "model": "Thread Sensor Tag",
            "name": "Thread Sensor Tag ["+uid+"]"
        }
    }

def send_config_message(uid, device_class, valuetag, unit_of_measurement):
    payload = generate_config_payload(uid, device_class, valuetag, unit_of_measurement)
    topic = "homeassistant/sensor/"+uid+"/"+device_class+"/config"
    log.info(f"'{topic}' => '{payload}'")
    clientMQTT.publish(topic, json.dumps(payload), retain=True)

def send_all_config_messages(uid):
    send_config_message(uid, "duration",    "alive",        "ms")
    send_config_message(uid, "battery",     "voltage",      "V")
    send_config_message(uid, "temperature", "temperature",  "°C")
    send_config_message(uid, "humidity",    "humidity",     "%")
    send_config_message(uid, "pressure",    "pressure",     "Pa")
    send_config_message(uid, "illuminance", "light",        "lx")

sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM) # UDP
sock.bind((UDP_IP, UDP_PORT))

# -------------------- main -------------------- 
config = cfg.configure_log(__file__)
#will start a separate thread for looping
clientMQTT = mqtt_start(config,None,True)

while True:
    data, addr = sock.recvfrom(1024) # buffer size is 1024 bytes
    message = data.decode("utf-8")
    log.info("udp message: " + message)
    parts = message.split("{")
    uid = parts[0].split('/')[1]
    send_all_config_messages(uid)

    topic = "homeassistant/sensor/"+uid+"/state"
    payload = '{'+parts[1].rstrip('\n')
    log.info(f"'{topic}' => {payload}")
    clientMQTT.publish(topic, payload)



'homeassistant/sensor/25B8E0117530C478/duration/config'
{
    'name': 'Thread Sensor Tag (duration)', 
    'obj_id': 'thread_sensor_tag_25B8E0117530C478_alive', 
    '~': 'homeassistant/sensor/25B8E0117530C478', 
    'uniq_id': '25B8E0117530C478#alive', 
    'state_topic': '~/state', 
    'unit_of_measurement': 'ms', 
    'device_class': 'duration', 
    'value_template': '{{ value_json.alive }}', 
    'force_update': True, 
    'device': {
        'identifiers': ['25B8E0117530C478'], 
        'manufacturer': 'open-things.de', 
        'model': 'Thread Sensor Tag', 
        'name': 'Thread Sensor Tag [25B8E0117530C478]'
    }
}
