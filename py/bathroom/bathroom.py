#https://github.com/studioimaginaire/phue


#https://pypi.python.org/pypi/paho-mqtt/1.1
import paho.mqtt.client as mqtt
import json
from time import sleep
import time
import logging as log
import sys,os
import cfg
from mqtt import mqtt_start
import threading

input_timer = None

def set_fan_relay(fan_val):
    topic = "shellies/shellyswitch25-B8A4EE/relay/1/command"
    clientMQTT.publish(topic,fan_val)
    log.debug(f"set_fan_relay> to {fan_val}. state = {state}")
    return

def stop_fan_relay_on_conditions():
    log.debug(f"stop_fan_relay_on_conditions> state = {state}")
    if(state["button_fan_timer_min"] != 0):
        log.info(f"stop_fan_relay_on_conditions> stop rejected, user timer running. state = {state}")
        return
    if(state["input"] == True):
        log.info(f"stop_fan_relay_on_conditions> stop rejected, (light) 'input' is on. state = {state}")
        return
    if(state["humidity_sensor_alive"]):
        if(state["humidity"] > config["humidity"]["stop_fan"]):
            log.info(f"stop_fan_relay_on_conditions> stop rejected, humidity too high. state = {state}")
        else:
            log.info(f"stop_fan_relay_on_conditions> stop accepted, not humid. state = {state}")
            set_fan_relay("off")
    else:
        log.info(f"stop_fan_relay_on_conditions> stop accepted as light is off and humidity unavailable. state = {state}")
        set_fan_relay("off")
    return

def input_timer_trigger():
    log.info(f"input_timer_trigger> trigger")
    #if input still active after the delay since its start, then start the fan
    if(state["input"] == True):
        set_fan_relay("on")
    return

def button_timer_trigger():
    global state
    log.debug(f"button_timer_trigger> trigger. state = {state}")
    if(state["button_fan_timer_min"] > 0):
        state["button_fan_timer_min"] = state["button_fan_timer_min"] - 1
        threading.Timer(60, button_timer_trigger).start()
    else:
        stop_fan_relay_on_conditions()
    return

def humidity_sensor_timer():
    global state
    if(state["humidity_sensor_timer_min"] > 0):
        state["humidity_sensor_timer_min"] = state["humidity_sensor_timer_min"] - 1
    else:
        state["humidity_sensor_alive"] = False
        log.warning(f"humidity_sensor_timer> humidity sensor dead")
    threading.Timer(60, humidity_sensor_timer).start()
    return

def start_input_timer():
    global input_timer
    #start timer
    delay_min = int(config["input_to_fan_delay_min"])
    input_timer = threading.Timer(60*delay_min, input_timer_trigger)
    input_timer.start()
    log.info(f"start_input_timer> state = {state}")
    return

def shelly_input(payload):
    global state
    input_state = int(payload)
    if(input_state == 1) and (state["input"] == False):
        log.info(f"shelly_input> =>1. state = {state}")
        state["input"] = True
        start_input_timer()
    elif(input_state == 0) and (state["input"] == True):
        log.info(f"shelly_input> =>0. state = {state}")
        state["input"] = False
        if(input_timer):
            input_timer.cancel()
        stop_fan_relay_on_conditions()
    return

def shelly_light_relay(payload):
    global state
    relay_state = payload.decode()
    log.debug(f"shelly_light_relay> relay_state = {relay_state}. state = {state}")
    if(relay_state == "on") and (state["light_relay"] == False):
        state["light_relay"] = True
        log.debug(f"shelly_light_relay> =>on. state = {state}")
    elif(relay_state == "off") and (state["light_relay"] == True):
        state["light_relay"] = False
        log.debug(f"shelly_light_relay> =>off. state = {state}")
    return

def shelly_fan_relay(payload):
    global state
    relay_state = payload.decode()
    log.debug(f"shelly_fan_relay> relay_state = {relay_state}. state = {state}")
    if(relay_state == "on") and (state["fan_relay"] == False):
        state["fan_relay"] = True
        log.debug(f"shelly_fan_relay> =>on. state = {state}")
    elif(relay_state == "off") and (state["fan_relay"] == True):
        state["fan_relay"] = False
        log.debug(f"shelly_fan_relay> =>off. state = {state}")
    return

def sensor_humidity(payload):
    global state
    sensor = json.loads(payload)
    if(not "humidity" in sensor):#light packet no humidity
        return
    humidity_level = float(sensor["humidity"])
    log.debug(f"sensor_humidity> {humidity_level}")
    old_humidity = state["humidity"]
    state["humidity"] = humidity_level
    stop = config["humidity"]["stop_fan"]
    start = config["humidity"]["start_fan"]
    if(old_humidity >= stop) and (humidity_level < stop):
        if(state["input"] == False):
            log.info(f"sensor_humidity> humidity down")
            stop_fan_relay_on_conditions()
    elif(old_humidity <= start) and (humidity_level > start):
        set_fan_relay("on")
        log.info(f"sensor_humidity> humidity up")
    state["humidity_sensor_alive"] = True
    state["humidity_sensor_timer_min"] = config["humidity_sensor_timeout_min"]
    return

def button_fan(payload):
    global state
    sensor = json.loads(payload)
    if("click" in sensor and sensor["click"] == "single"):
        log.info("button_fan> single click")
        if(state["fan_relay"] == False):
            set_fan_relay("on")
            state["button_fan_timer_min"] = config["button_fan_short_min"]
            button_timer_trigger()
        else:
            #user force stopping the fan on all conditions
            set_fan_relay("off")
    elif("action" in sensor and sensor["action"] == "hold"):
        log.info("button_fan> long press")
        set_fan_relay("on")
        state["button_fan_timer_min"] = config["button_fan_long_min"]
        button_timer_trigger()
    return

def mqtt_on_message(client, userdata, msg):
    try:
        topic_parts = msg.topic.split('/')
        if(msg.topic == "shellies/shellyswitch25-B8A4EE/input/0"):
            shelly_input(msg.payload)
        elif(msg.topic == "shellies/shellyswitch25-B8A4EE/relay/0"):
            shelly_light_relay(msg.payload)
        elif(msg.topic == "shellies/shellyswitch25-B8A4EE/relay/1"):
            shelly_fan_relay(msg.payload)
        elif(msg.topic == "lzig/bathroom weather"):
            sensor_humidity(msg.payload)
        elif(msg.topic == "lzig/bathroom fan button"):
            button_fan(msg.payload)
        else:
            log.error("unknown topic: "+msg.topic)
    except Exception as e:
        log.error("mqtt_on_message> Exception :%s"%e)
    return

# -------------------- main -------------------- 
config = cfg.configure_log(__file__)

# -------------------- Mqtt Client -------------------- 
#will start a separate thread for looping
clientMQTT = mqtt_start(config,mqtt_on_message,True)

state = {
    "input":False,
    "fan_relay":False,
    "light_relay":False,
    "humidity":50.0,
    "humidity_sensor_alive":True,
    "humidity_sensor_timer_min":config["humidity_sensor_timeout_min"],
    "button_fan_timer_min":0
    }

humidity_sensor_timer()

while(True):
    sleep(0.2)
    #The MQTT keeps looping on a thead
    #All there is to do here is not to exit
