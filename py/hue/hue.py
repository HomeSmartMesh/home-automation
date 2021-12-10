#https://github.com/studioimaginaire/phue


#https://pypi.python.org/pypi/paho-mqtt/1.1
import paho.mqtt.client as mqtt
import json
from phue import Bridge
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

states = {}

def bed_light_button(payload):
    log.debug("bed_light_button> taken")
    sensor = json.loads(payload)
    if("click" in sensor and sensor["click"] == "single"):
        if(lights["Bed Malm"].on):
            lights["Bed N"].on = False
            lights["Bed Malm"].on = False
            lights["Bed W"].on = False
            log.info("bed_light_button>(click-single)(on) => set light off")
        else:
            #switch on and brightness command together so that it does not go to previous level before adjusting the brightness
            b.set_light("Bed Malm", {'on' : True, 'bri' : 128})
            b.set_light("Bed N", {'on' : True, 'bri' : 128})
            b.set_light("Bed W", {'on' : True, 'bri' : 128})
            log.info("bed_light_button>(click-single)(off) set light to MID")
    elif("click" in sensor and sensor["click"] == "double"):
            b.set_light("Bed Malm", {'on' : True, 'bri' : 128})
            b.set_light("Bed N", {'on' : True, 'bri' : 128})
            b.set_light("Bed W", {'on' : True, 'bri' : 128})
            log.info("bed_light_button>(click-double)(X) set light to MAX")
    elif("action" in sensor and sensor["action"] == "hold"):
        b.set_light("Bed Malm", {'on' : True, 'bri' : 1})
        lights["Bed N"].on = False
        lights["Bed W"].on = False
        log.info("bed_light_button>(hold)(X) set light to min")
    return

def bathroom_shelly_light(cmd):
    topic = "shellies/shellyswitch25-B8A4EE/relay/0/command"
    clientMQTT.publish(topic,cmd)
    log.debug(f"set_light_relay> to {cmd}")
    return

def bathroom_light_hue():
    #switch on and brightness command together so that it does not go to previous level before adjusting the brightness
    b.set_light("Bathroom main", {'on' : True, 'bri' : 1})
    b.set_light("Bathroom main", {'on' : True, 'bri' : 1})
    log.debug("bathroom_light_hue> set light to min")
    return

def bathroom_light_button(payload):
    log.debug("bathroom light> taken")
    sensor = json.loads(payload)
    if("click" in sensor and sensor["click"] == "single"):
        bathroom_shelly_light("on")
        threading.Timer(1, bathroom_light_hue).start()
    elif("action" in sensor and sensor["action"] == "hold"):
        b.set_light("Bathroom main", {'on' : True, 'bri' : 1})
        log.debug("bathroom light> set light to min")
    return


#right, left, right_long, both, both_long, right double
def livroom_light_switch(payload):
    #brightness 0-254
    def living_top(brightness):
        if(brightness != 0):
            b.set_light("LivingTop1", {'on' : True, 'bri' : brightness})
            b.set_light("LivingTop2", {'on' : True, 'bri' : brightness})
            b.set_light("LivingTop3", {'on' : True, 'bri' : brightness})
            b.set_light("LivingTop4", {'on' : True, 'bri' : brightness})
            b.set_light("LivingTop5", {'on' : True, 'bri' : brightness})
        else:
            lights["LivingTop1"].on = False
            lights["LivingTop2"].on = False
            lights["LivingTop3"].on = False
            lights["LivingTop4"].on = False
            lights["LivingTop5"].on = False
        return
    def malms(brightness):
        if(brightness != 0):
            b.set_light("malms 1", {'on' : True, 'bri' : brightness})
            b.set_light("malms 2", {'on' : True, 'bri' : brightness})
            b.set_light("malms 3", {'on' : True, 'bri' : brightness})
            b.set_light("malms 4", {'on' : True, 'bri' : brightness})
        else:
            lights["malms 1"].on = False
            lights["malms 2"].on = False
            lights["malms 3"].on = False
            lights["malms 4"].on = False
        return
    sensor = json.loads(payload)
    if("click" in sensor):
        log.info(f"living room light switch double> {sensor['click']}")
        if(sensor["click"] == "right"):
            if(lights["LivingTop1"].on):
                living_top(0)
                log.info("living room light> set light off")
            else:
                living_top(180)
                log.info("living room light> set light to mid")
        elif(sensor["click"] == "right_long"):
            living_top(1)
            log.info("living room light> set light to min")
        elif(sensor["click"] == "right_double"):
            living_top(254)
            log.info("living room light> set light to MAX")
        elif(sensor["click"] == "left"):
            if(lights["malms 1"].on):
                malms(0)
                log.info("malms light> set light off")
            else:
                malms(180)
                log.info("malms light> set light to mid")
        elif(sensor["click"] == "left_long"):
            malms(1)
            log.info("malms light> set light to min")
        elif(sensor["click"] == "left_double"):
            malms(254)
            log.info("malms light> set light to MAX")
        elif(sensor["click"] == "both"):
            if(lights["LivingTop1"].on):
                malms(0)
                living_top(0)
                log.info("all lights> set light off")
            else:
                malms(180)
                living_top(180)
                log.info("all lights> set light to mid")
        elif(sensor["click"] == "both_long"):
            malms(1)
            living_top(1)
            log.info("all lights> set light to min")
        elif(sensor["click"] == "both_double"):
            malms(254)
            living_top(254)
            log.info("all lights> set light to MAX")
    return


def livroom_light_button(payload):
    log.debug("living room light> taken")
    sensor = json.loads(payload)
    if("click" in sensor and sensor["click"] == "single"):
        if(lights["LivingTop5"].on):
            lights["LivingTop1"].on = False
            lights["LivingTop2"].on = False
            lights["LivingTop3"].on = False
            lights["LivingTop4"].on = False
            lights["LivingTop5"].on = False
            log.debug("living room light> set light off")
        else:
            #switch on and brightness command together so that it does not go to previous level before adjusting the brightness
            b.set_light("LivingTop1", {'on' : True, 'bri' : 254})
            b.set_light("LivingTop2", {'on' : True, 'bri' : 254})
            b.set_light("LivingTop3", {'on' : True, 'bri' : 254})
            b.set_light("LivingTop4", {'on' : True, 'bri' : 254})
            b.set_light("LivingTop5", {'on' : True, 'bri' : 254})
            log.debug("living room light> set light to MAX")
    elif("action" in sensor and sensor["action"] == "hold"):
        b.set_light("LivingTop1", {'on' : True, 'bri' : 1})
        b.set_light("LivingTop2", {'on' : True, 'bri' : 1})
        b.set_light("LivingTop3", {'on' : True, 'bri' : 1})
        b.set_light("LivingTop4", {'on' : True, 'bri' : 1})
        b.set_light("LivingTop5", {'on' : True, 'bri' : 1})
        log.debug("living room light> set light to min")
    return

def office_switch(payload):
    #log.info(f"office_switch ===> {payload}")
    switch = json.loads(payload)
    if("click" in switch and switch["click"] == "single"):
        if(lights["office curtain"].on):
            lights["office main"].on = False
            lights["office curtain"].on = False
            room_switches_control(config["lightmap"]["office"],"OFF")
            log.info("office_light>(click)(curtain on) => all off")
        else:
            #command so that it does not go to previous level before adjusting the brightness
            b.set_light("office main", {'on' : True, 'bri' : 255})
            b.set_light("office curtain", {'on' : True, 'bri' : 100})
            room_switches_control(config["lightmap"]["office"],"ON")
            log.info("office_light>(click)(curtain off) => all on, some low")
    elif("action" in switch and switch["action"] == "hold"):
            b.set_light("office curtain", {'on' : True, 'bri' : 1})
            lights["office main"].on = False
            log.info("office_light>(hold)(x) => curtain low, rest off")
    #else:
    #    log.debug("office_light>no click")
    return

def office_dimm(payload):
    #log.info(f"office_switch ===> {payload}")
    volume = json.loads(payload)
    if("action" in volume and volume["action"] == "play_pause"):
            b.set_light("office desk", {'on' : True, 'bri' : 128})
            log.info("office_dimm>(double)(X) => desk mid")
    elif("action" in volume and volume["action"] == "skip_forward"):
            lights["office desk"].on = False
            log.info("office_dimm>(single)(X) => desk off")
    elif("action" in volume and volume["action"] == "rotate_left"):
            brightness = b.get_light("office desk")['state']['bri']
            brightness = brightness-10
            if(brightness < 0):
                brightness = 0
            if(brightness == 0):
                lights["office desk"].on = False
                log.info(f"office_dimm>(rotate lower)(0) => (Off)")
            else:
                b.set_light("office desk", {'on' : True, 'bri' : brightness})
                log.info(f"office_dimm>(rotate lower) => ({brightness})")
    elif("action" in volume and volume["action"] == "rotate_right"):
            brightness = b.get_light("office desk")['state']['bri']
            brightness = brightness+10
            if(brightness > 254):
                brightness = 254
            if(brightness == 254):
                b.set_light("office desk", {'on' : True, 'bri' : 0,'transitiontime':5})
                b.set_light("office desk", {'on' : True, 'bri' : 254,'transitiontime':5})
                log.info(f"office_dimm>(rotate higher)(X) => (blink MAX)")
            else:
                b.set_light("office desk", {'on' : True, 'bri' : brightness})
                log.info(f"office_dimm>(rotate higher) => ({brightness})")
    return

def entrance_light(payload):
    jval = json.loads(payload)
    if("click" in jval and jval["click"] == "single"):
        if(lights["Entrance White 1"].on):
            lights["Entrance White 1"].on = False
            lights["Entrance White 2"].on = False
            log.debug("entrance_light> off")
        else:
            #command so that it does not go to previous level before adjusting the brightness
            b.set_light("Entrance White 1", {'on' : True, 'bri' : 255})
            b.set_light("Entrance White 2", {'on' : True, 'bri' : 255})
            log.debug("entrance_light> on")
    elif("contact" in jval and jval["contact"] == False):
        #TODO check brightness here - and diff between coming or going away
        log.debug("entrance_door>open")
    else:
        log.debug("entrance_light>no click")
    return

def light_list_clicks(room,room_name,payload):
    jval = json.loads(payload)
    if("click" in jval and jval["click"] == "single"):
        if(lights[room["lights"][0]].on):
            for light_name in room["lights"]:
                lights[light_name].on = False
            log.info(f"{room_name} lights> off")
        else:
            #command so that it does not go to previous level before adjusting the brightness
            for light_name in room["lights"]:
                lights[light_name].on = False
                b.set_light(light_name, {'on' : True, 'bri' : 128})
            log.info(f"{room_name} lights> on")
    elif("click" in jval and jval["click"] == "double"):
        for light_name in room["lights"]:
            lights[light_name].on = False
            b.set_light(light_name, {'on' : True, 'bri' : 255})
        log.info(f"{room_name} lights> on Full Brightness")
    elif("action" in jval and jval["action"] == "hold"):
        for light_name in room["lights"]:
            lights[light_name].on = False
            b.set_light(light_name, {'on' : True, 'bri' : 1})
        log.info(f"{room_name} lights> on Lowest Brightness")
    return

def room_switches_control(room,cmd):
    if "switches" in room:
        for switch_topic in room["switches"]:
            topic = f"{room['base_topic']}/{switch_topic}/set"
            state_cmd = '{"state":"'+cmd+'"}'
            clientMQTT.publish(topic,state_cmd)


def light_hold_switch(room,room_name,payload):
    jval = json.loads(payload)
    if("click" in jval and jval["click"] == "single"):
        switch_0 = room["switches"][0]
        if(lights[room["lights"][0]].on):
            for light_name in room["lights"]:
                lights[light_name].on = False
            room_switches_control(room,"OFF")
            log.info(f"{room_name} lights> OFF ; switches> OFF (light_0 was on)")
        elif((switch_0 in states) and (states[switch_0] == "ON")):
            for light_name in room["lights"]:
                lights[light_name].on = False
            room_switches_control(room,"OFF")
            log.info(f"{room_name} lights> OFF ; switches> OFF (switch_0 was on)")
        else:
            #command so that it does not go to previous level before adjusting the brightness
            for light_name in room["lights"]:
                lights[light_name].on = False
                b.set_light(light_name, {'on' : True, 'bri' : 128})
            log.info(f"{room_name} lights> on")
    elif("click" in jval and jval["click"] == "double"):
        for light_name in room["lights"]:
            lights[light_name].on = False
            b.set_light(light_name, {'on' : True, 'bri' : 255})
            room_switches_control(room,"ON")
        log.info(f"{room_name} lights> on Full Brightness ; switches> ON")
    elif("action" in jval and jval["action"] == "hold"):
        for light_name in room["lights"]:
            lights[light_name].on = False
        room_switches_control(room,"TOGGLE")
        log.info(f"{room_name} switches> toggled")
    return

def call_action(room,room_name,payload):
    possibles = globals().copy()
    possibles.update(locals())
    method = possibles.get(room["action"])
    log.debug(f"calling => ({room['action']})")
    method(room,room_name,payload)
    return

def mqtt_on_message(client, userdata, msg):
    global states
    #log.info(f"{msg.topic} : {msg.payload}")
    try:
        topic_parts = msg.topic.split('/')
        if(len(topic_parts) == 2):
            sensor_name = topic_parts[1]
            if(sensor_name == "office switch"):
                office_switch(msg.payload)
            elif(sensor_name == "tree button"):
                bathroom_light_button(msg.payload)
            elif(sensor_name == "liv light 1 button"):
                livroom_light_button(msg.payload)
            elif(sensor_name == "living double switch"):
                livroom_light_switch(msg.payload)
            else:
                for room_name,room in config["lightmap"].items():
                    if sensor_name in room["sensors"]:
                        call_action(room,room_name,msg.payload)
                    if "switches" in room:
                        if topic_parts[1] in room["switches"]:
                            jval = json.loads(msg.payload)
                            if("state" in jval):
                                states[topic_parts[1]] = jval["state"]

        else:
            log.error("topic: "+msg.topic + "size not matching")
    except Exception as e:
        log.error("mqtt_on_message> Exception :%s"%e)
    return

# -------------------- main -------------------- 
config = cfg.configure_log(__file__)

# -------------------- Philips Hue Client -------------------- 
log.info("Check Bridge Presence")

if(cfg.ping(config["bridges"]["LivingRoom"])):
    file_path=config["bridges"]["username_config"]
    log.info(f"Bridge Connection using config '{file_path}'")
    b = Bridge(ip=config["bridges"]["LivingRoom"],config_file_path=file_path)
    b.connect()
    log.info("Light Objects retrieval")
    lights = b.get_light_objects('name')
    log.info("Hue Lights available :")
    for name, light in lights.items():
        log.info(name)
    
else:
    log.info("Bridge ip not responding")


# -------------------- Mqtt Client -------------------- 
#will start a separate thread for looping
clientMQTT = mqtt_start(config,mqtt_on_message,True)

while(True):
    sleep(0.2)
    #The MQTT keeps looping on a thead
    #All there is to do here is not to exit
