#https://pypi.python.org/pypi/paho-mqtt/1.1
import paho.mqtt.client as mqtt
import socket 
import logging as log
import cfg
from mqtt import mqtt_start
import time

UDP_IP = "::" # = 0.0.0.0 u IPv4
UDP_PORT = 4242

sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM) # UDP
sock.bind((UDP_IP, UDP_PORT))

# -------------------- main -------------------- 
config = cfg.configure_log(__file__)
#will start a separate thread for looping
clientMQTT = mqtt_start(config,None,True)

while True:
    data, addr = sock.recvfrom(1024) # buffer size is 1024 bytes
    message = data.decode("utf-8")
    parts = message.split("{")
    topic = parts[0]
    payload = '{'+parts[1].rstrip('\n')
    log.info(f"'{topic}' => {payload}")
    clientMQTT.publish(topic,payload)
