#https://github.com/studioimaginaire/phue


#https://pypi.python.org/pypi/paho-mqtt/1.1
import paho.mqtt.client as mqtt
import json
from time import sleep
import logging as log
import cfg
from mqtt import mqtt_start
import threading

input_timer = None

def set_fan_relay(fan_val):
    topic = "shellies/bathroom/rpc"
    is_on = (fan_val == "on")
    payload = {"src":"raspi","method":"Switch.Set","params":{"id":0,"on":is_on}}
    clientMQTT.publish(topic,json.dumps(payload))
    log.debug(f"set_fan_relay> to {fan_val}. state = {state}")
    return

def stop_fan_relay_on_conditions():
    log.debug(f"stop_fan_relay_on_conditions> state = {state}")
    if(state["button_fan_timer_min"] != 0):
        log.info(f"stop_fan_relay_on_conditions> stop rejected, user timer running. state = {state}")
        return
    if(state["light"] == True):
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
    if(state["light"] == True):
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

def shelly_fan_relay(payload):
    global state
    data = json.loads(payload)
    relay_state = data["output"]
    log.debug(f"shelly_fan_relay> relay_state = {relay_state}. state = {state}")
    if(relay_state) and (state["fan_relay"] == False):
        state["fan_relay"] = True
        log.debug(f"shelly_fan_relay> =>on. state = {state}")
    elif(not relay_state) and (state["fan_relay"] == True):
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
        if(state["light"] == False):
            log.info(f"sensor_humidity> humidity down")
            stop_fan_relay_on_conditions()
    elif(old_humidity <= start) and (humidity_level > start):
        set_fan_relay("on")
        log.info(f"sensor_humidity> humidity up")
    state["humidity_sensor_alive"] = True
    state["humidity_sensor_timer_min"] = config["humidity_sensor_timeout_min"]
    return

def fan_action(action):
    global state
    if(action == "single"):
        log.info("button_fan> single click")
        print(state)
        if(state["fan_relay"] == False):
            set_fan_relay("on")
            state["button_fan_timer_min"] = config["button_fan_short_min"]
            button_timer_trigger()
        else:
            #user force stopping the fan on all conditions
            set_fan_relay("off")
        return
    if(action == "hold"):
        log.info("button_fan> long press")
        set_fan_relay("on")
        state["button_fan_timer_min"] = config["button_fan_long_min"]
        button_timer_trigger()
        return
    return

def button_fan(payload):
    global state
    sensor = json.loads(payload)
    if("click" in sensor and sensor["click"] == "single"):
        fan_action("single")
    elif("action" in sensor and sensor["action"] == "hold"):
        fan_action("hold")
    return

def bathroom_light_double(payload):
    sensor = json.loads(payload)
    if(not "action" in sensor):
        return
    action = sensor["action"]
    if(("left" in action) or ("both" in action)):
        if("double" in action):
            fan_action("double")#does nothing
        elif("long" in action):
            fan_action("hold")
        else:
            fan_action("single")
    return

def shelly_input(payload):
    global state
    input_state = int(payload)
    if(input_state == 1) and (state["light"] == False):
        log.info(f"shelly_input> =>1. state = {state}")
        state["light"] = True
        start_input_timer()
    elif(input_state == 0) and (state["light"] == True):
        log.info(f"shelly_input> =>0. state = {state}")
        state["light"] = False
        if(input_timer):
            input_timer.cancel()
        stop_fan_relay_on_conditions()
    return

def bathroom_light_state(payload):
    light_state = payload.decode('utf-8')
    if(light_state != "OFF") and (state["light"] == False):
        log.info(f"light> =>1. state = {state}")
        state["light"] = True
        start_input_timer()
    elif(light_state == "OFF") and (state["light"] == True):
        log.info(f"light> =>0. state = {state}")
        state["light"] = False
        if(input_timer):
            input_timer.cancel()
        stop_fan_relay_on_conditions()
    return

def mqtt_on_message(client, userdata, msg):
    try:
        print(f"topic: {msg.topic}")
        topic_parts = msg.topic.split('/')
        if(msg.topic == "lzig/bathroom double switch"):
            bathroom_light_double(msg.payload)
        elif(msg.topic == "shellies/bathroom/status/switch:0"):
            shelly_fan_relay(msg.payload)
        elif(msg.topic == "thread_tags/thingy02/env"):
            sensor_humidity(msg.payload)
        elif(msg.topic == "lzig/bathroom fan button"):
            button_fan(msg.payload)
        elif(msg.topic == "lights/bathroom"):
            bathroom_light_state(msg.payload)
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
    "light":False,
    "fan_relay":False,
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
