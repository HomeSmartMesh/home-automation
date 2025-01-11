#https://github.com/studioimaginaire/phue
#https://pypi.python.org/pypi/paho-mqtt/1.1
import json
from phue import Bridge
#just to get host name
from time import sleep
import logging as log
import cfg
from mqtt import mqtt_start
import threading

states = {}

def room_switches_control(room_name,cmd):
    if(cmd in ["ON","OFF","TOGGLE"]):
        room = config["lightmap"][room_name]
        if "switches" in room:
            log.info(f"{room_name} switches> {cmd}")
            for switch_topic in room["switches"]:
                topic = f"{config['mqtt']['base_topic']}/{switch_topic}/set"
                state_cmd = '{"state":"'+cmd+'"}'
                clientMQTT.publish(topic,state_cmd)

def update_broker_state(room_name,cmd):
    if(cmd != "TOGGLE"):
        clientMQTT.publish(f"lights/{room_name}",cmd)
    return

def switch_off(room_name):
    update_broker_state(room_name,"OFF")
    log.info(f"{room_name} lights> delayed Switch OFF")
    room = config["lightmap"][room_name]
    for light_name in room["lights"]:
        lights[light_name].on = False
    return

def delayed_switch_off(room_name):
    timer = threading.Timer(5,switch_off, args=(room_name,))
    timer.start()
    return

def room_lights_control(room_name,cmd,toggle_value="MID"):
    update_broker_state(room_name,cmd)
    log.info(f"{room_name} lights> {cmd}")
    room = config["lightmap"][room_name]
    if(cmd == "ON"):
        for light_name in room["lights"]:
            lights[light_name].on = True
    elif(cmd == "OFF"):
        room_lights_control(room_name,"DIM")
        delayed_switch_off(room_name)
    elif(cmd == "DIM"):
        for light_name in room["lights"]:
            b.set_light(light_name, {'on' : True, 'bri' : 1})
    elif(cmd == "MID"):
        for light_name in room["lights"]:
            b.set_light(light_name, {'on' : True, 'bri' : 128})
    elif(cmd == "BRIGHT"):
        for light_name in room["lights"]:
            lights[light_name].on = False
            b.set_light(light_name, {'on' : True, 'bri' : 254})
    elif(cmd == "TOGGLE"):
        any_light_is_on = False
        for room_light in room["lights"]:
            if(lights[room_light].on):
                any_light_is_on = True
                continue
        if(any_light_is_on):
            room_lights_control(room_name,"OFF")
        else:
            room_lights_control(room_name,toggle_value)
        return

def room_light_brightness(room_name,brightness):
    room = config["lightmap"][room_name]
    if(brightness != 0):
        log.info(f"{room_name} setting brightness to {brightness}")
        for light_name in room["lights"]:
            lights[light_name].on = False
            b.set_light(light_name, {'on' : True, 'bri' : 254})
    else:
        log.info(f"{room_name} switch off")
        for light_name in room["lights"]:
            lights[light_name].on = False
    return

def room_control(room_name,cmd):
    room_lights_control(room_name,cmd)
    room_switches_control(room_name,cmd)

def livingroom_light_double(payload):
    sensor = json.loads(payload)
    if(not "action" in sensor):
        return
    action = sensor["action"]
    if(("right" in action) or ("both" in action)):
        if("double" in action):
            room_lights_control("livingtop","BRIGHT")
        elif("hold" in action):
            room_lights_control("livingtop","DIM")
        else:
            room_lights_control("livingtop","TOGGLE")
    if(("left" in action) or ("both" in action)):
        if("double" in action):
            room_lights_control("malms","BRIGHT")
        elif("hold" in action):
            room_lights_control("malms","DIM")
        else:
            room_lights_control("malms","TOGGLE")
    return

def bedroom_light_double(payload):
    sensor = json.loads(payload)
    if(not "action" in sensor):
        return
    action = sensor["action"]
    if(("left" in action) or ("both" in action)):
        if("double" in action):
            room_lights_control("bedroomtop","BRIGHT")
        elif("long" in action):
            room_lights_control("bedroomtop","DIM")
        else:
            room_lights_control("bedroomtop","TOGGLE")
    if(("right" in action) or ("both" in action)):
            room_lights_control("bedroomtop","OFF")
            room_switches_control("bedroomambient","TOGGLE")
    return

def bathroom_light_double(payload):
    sensor = json.loads(payload)
    if(not "action" in sensor):
        return
    action = sensor["action"]
    if(("right" in action) or ("both" in action)):
        if("double" in action):
            room_lights_control("bathroom","BRIGHT")
        elif("long" in action):
            room_lights_control("bathroom","DIM")
        else:
            room_lights_control("bathroom","TOGGLE","BRIGHT")
    return

def bedroom_light_switch(payload):
    sensor = json.loads(payload)
    if(not "action" in sensor):
        return
    room_lights_control("bedroomtop","OFF")
    room_switches_control("bedroomambient","TOGGLE")
    return

def livroom_light_button(payload):
    log.debug("living room light> taken")
    sensor = json.loads(payload)
    if("click" in sensor and sensor["click"] == "single"):
        if(lights["LivingTop5"].on):
            room_control("livingroom","OFF")
        else:
            #switch on and brightness command together so that it does not go to previous level before adjusting the brightness
            room_control("livingroom","ON")
    elif("action" in sensor and sensor["action"] == "hold"):
        room_control("livingroom","DIM")
    return

def office_switch(payload):
    #log.info(f"office_switch ===> {payload}")
    switch = json.loads(payload)
    if("click" in switch and switch["click"] == "single"):
        if(lights["office curtain"].on):
            lights["office main"].on = False
            lights["office curtain"].on = False
            room_switches_control("office","OFF")
        else:
            #command so that it does not go to previous level before adjusting the brightness
            b.set_light("office main", {'on' : True, 'bri' : 255})
            b.set_light("office curtain", {'on' : True, 'bri' : 100})
            room_switches_control("office","ON")
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

def light_list_clicks(room_name,payload):
    room = config["lightmap"][room_name]
    jval = json.loads(payload)
    if("click" in jval and jval["click"] == "single"):
        if(lights[room["lights"][0]].on):
            room_lights_control(room_name,"OFF")
        else:
            #command so that it does not go to previous level before adjusting the brightness
            room_lights_control(room_name,"MID")
    elif("click" in jval and jval["click"] == "double"):
        room_lights_control(room_name,"BRIGHT")
    elif("action" in jval and jval["action"] == "hold"):
        room_lights_control(room_name,"DIM")
    return

def light_hold_switch(room_name,payload):
    room = config["lightmap"][room_name]
    jval = json.loads(payload)
    if("click" in jval and jval["click"] == "single"):
        switch_0 = room["switches"][0]
        if(lights[room["lights"][0]].on):
            room_control(room_name,"OFF")
        elif((switch_0 in states) and (states[switch_0] == "ON")):
            room_control(room_name,"OFF")
        else:
            #command so that it does not go to previous level before adjusting the brightness
            room_lights_control(room_name,"MID")
    elif("click" in jval and jval["click"] == "double"):
        room_lights_control(room_name,"BRIGHT")
        room_switches_control(room_name,"ON")
    elif("action" in jval and jval["action"] == "hold"):
        room_lights_control(room_name,"OFF")
        room_switches_control(room_name,"TOGGLE")
    return

def call_action(room_name,payload):
    possibles = globals().copy()
    possibles.update(locals())
    method = possibles.get(config["lightmap"][room_name]["action"])
    log.debug(f"calling => ({config['lightmap'][room_name]['action']})")
    method(room_name,payload)
    return

def mqtt_on_message(client, userdata, msg):
    global states
    log.info(f"{msg.topic} : {msg.payload}")
    try:
        topic_parts = msg.topic.split('/')
        if(len(topic_parts) == 2):
            sensor_name = topic_parts[1]
            if(sensor_name == "office switch"):
                office_switch(msg.payload)
            elif(sensor_name == "office light button"):
                office_switch(msg.payload)
            elif(sensor_name == "living double switch"):
                livingroom_light_double(msg.payload)
            elif(sensor_name == "bedroom double switch"):
                bedroom_light_double(msg.payload)
            elif(sensor_name in ["bedroom switch","bed light button"]):
                bedroom_light_switch(msg.payload)
            elif(sensor_name == "bathroom double switch"):
                bathroom_light_double(msg.payload)
            else:
                for room_name,room in config["lightmap"].items():
                    if "sensors" in room:
                        if sensor_name in room["sensors"]:
                            call_action(room_name,msg.payload)
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

def check_bridge():
    global b
    global lights
    if(cfg.ping(config["bridges"]["LivingRoom"])):
        file_path=config["bridges"]["username_config"]
        log.info(f"Bridge Connection using config '{file_path}'")
        b = Bridge(ip=config["bridges"]["LivingRoom"],config_file_path=file_path)
        b.connect()
        log.info("Light Objects retrieval")
        lights = b.get_light_objects('name')
        log.info("Hue Lights available :")
        for name, light in lights.items():
            log.info(f"{name} reachable {light.reachable}")
        return True
    else:
        log.info("Bridge ip not responding")
        return False

b = None
lights = None
# -------------------- main -------------------- 
config = cfg.configure_log(__file__)

# -------------------- Philips Hue Client -------------------- 
log.info("Check Bridge Presence")

while(not check_bridge()):
    sleep(10)

# -------------------- Mqtt Client -------------------- 
#will start a separate thread for looping
clientMQTT = mqtt_start(config,mqtt_on_message,True)

while(True):
    sleep(0.2)
    #The MQTT keeps looping on a thead
    #All there is to do here is not to exit
