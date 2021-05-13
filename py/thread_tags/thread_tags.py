#https://pypi.python.org/pypi/paho-mqtt/1.1
import paho.mqtt.client as mqtt
import json
#just to get host name
import socket 
from time import sleep
import time
from math import ceil
import logging as log
import sys,os
import cfg
from mqtt import mqtt_start
import threading
import time

def mqtt_on_message(client, userdata, msg):

    return

UDP_IP = "::" # = 0.0.0.0 u IPv4
UDP_PORT = 4242

sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM) # UDP
sock.bind((UDP_IP, UDP_PORT))

# -------------------- main -------------------- 
config = cfg.configure_log(__file__)
#will start a separate thread for looping
clientMQTT = mqtt_start(config,mqtt_on_message,True)

while True:
    data, addr = sock.recvfrom(1024) # buffer size is 1024 bytes
    message = data.decode("utf-8")
    parts = message.split("{")
    topic = parts[0]
    payload = '{'+parts[1].rstrip('\n')
    log.debug(f"'{topic}' => {payload}")
    clientMQTT.publish(topic,payload)
