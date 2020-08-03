
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


def double_steps_brightness(light,short_time_brightness,final):
    b.set_light(light, {'on' : True, 'bri' : short_time_brightness, 'hue':8101, 'sat':194, 'transitiontime' : 30})
    log.debug("bedroom_sunrise> fast 3 sec to %d",short_time_brightness)
    #the rest souldshould catch in 10 min average from 0 to max
    if(short_time_brightness < 255):
        brightness_left = int(255 - short_time_brightness)
        time_left = int(brightness_left * 10 * 60 * 10 / 250)
        b.set_light(light, {'on' : True, 'bri' : final, 'hue':8101, 'sat':194, 'transitiontime' : time_left})
        log.debug("bedroom_sunrise> slow till %d in %d sec",final,time_left/10)
    return

def bedroom_sunrise(payload):
    jval = json.loads(payload)
    if("click" in jval and jval["click"] == "single"):
        if(not lights["Bed Leds Cupboard"].on):
            current_brightness = 0
            short_time_brightness = 1
        else:
            current_brightness = lights["Bed Leds Cupboard"].brightness
            if(current_brightness < 215):
                short_time_brightness = current_brightness + 40
            else:
                short_time_brightness = 255
        log.debug("beroom_sunrise>current brightness %d",current_brightness)
        double_steps_brightness("Bed Leds Cupboard",short_time_brightness,255)
    elif("click" in jval and jval["click"] == "double"):
        if(not lights["Bed Leds Cupboard"].on):
            b.set_light(light, {'on' : True, 'bri' : 255, 'hue':8101, 'sat':194})
        else:
            lights["Bed Leds Cupboard"].on = False
    elif("action" in jval and jval["action"] == "hold"):
        if(not lights["Bed Leds Cupboard"].on):
            log.warn("beroom_sunrise>already off nothing to do")
        else:
            current_brightness = lights["Bed Leds Cupboard"].brightness
            if(current_brightness > 41):
                short_time_brightness = current_brightness - 40
            elif(current_brightness > 3):
                short_time_brightness = 1
            else:
                lights["Bed Leds Cupboard"].on = False
        log.debug("beroom_sunrise>current brightness %d",current_brightness)
        double_steps_brightness("Bed Leds Cupboard",short_time_brightness,0)
    else:
        log.debug("bedroom_sunrise>no click")
    return

isLightOn = False

def night_hunger(payload):
    global isLightOn
    sensor = json.loads(payload)
    if(sensor["occupancy"]):
        if(sensor["illuminance"] < 30):
            lights["printer light"].on = True
            isLightOn = True
            log.info("Kitchen_Move>switch lights on")
        else:
            log.debug("Kitchen_Move>bright no light needed")
    else:
        if(isLightOn):
            lights["printer light"].on = False
            log.info("Kitchen_Move>switch lights off")
            isLightOn = False
        else:
            log.debug("Kitchen_Move>light is already off")
    return 

def stairs_off_callback():
    lights["Stairs Up Left"].on = False
    lights["Stairs Down Right"].on = False
    log.debug("Stairs - off_callback")
    return

g_stairs_up_light = 0.0
g_stairs_down_light = 0.0

def stairs_up_move(payload):
    global g_stairs_up_light
    global g_stairs_down_light
    #log.debug("stairs_presence : %s"%payload)
    sensor = json.loads(payload)
    if("illuminance" in sensor):
        log.debug("light => %f"%sensor["illuminance"])
        g_stairs_up_light = float(sensor["illuminance"])
        log.debug("light => stairs up : %f"%g_stairs_up_light)
    if("occupancy" in sensor):
        log.debug("presence => %d"%sensor["occupancy"])
        if(sensor["occupancy"]):
            if(g_stairs_up_light < 2):
                brightness = 254
            elif(g_stairs_up_light < 12):
                brightness = 128
            else:
                brightness = 10
            log.debug(f"presence => MotionLight Up - brightness:{brightness}")
            b.set_light("Stairs Up Left", {'transitiontime' : 30, 'on' : True, 'bri' : brightness})
            b.set_light("Stairs Down Right", {'transitiontime' : 10, 'on' : True, 'bri' : int(brightness)})
            threading.Timer(60, stairs_off_callback).start()
    return

def stairs_down_move(payload):
    global g_stairs_up_light
    global g_stairs_down_light
    #log.debug("stairs_presence : %s"%payload)
    sensor = json.loads(payload)
    if("illuminance" in sensor):
        log.debug("light => %f"%sensor["illuminance"])
        g_stairs_down_light = float(sensor["illuminance"])
        log.debug("light => MotionLightHue: %f"%g_stairs_down_light)
    if("occupancy" in sensor):
        log.debug("presence => %d"%sensor["occupancy"])
        if(sensor["occupancy"]):
            if(g_stairs_up_light < 2):
                brightness = 254
            elif(g_stairs_up_light < 12):
                brightness = 128
            else:
                brightness = 10
            log.debug(f"presence => MotionLight Down - brightness:{brightness}")
            b.set_light("Stairs Down Right", {'transitiontime' : 10, 'on' : True, 'bri' : brightness})
            b.set_light("Stairs Up Left", {'transitiontime' : 30, 'on' : True, 'bri' : int(brightness)})
            threading.Timer(60, stairs_off_callback).start()
    return

def office_alive(payload):
    global office_last_seen
    report = json.loads(payload)
    if("rssi" in report):
        if(int(report["rssi"]) > -60):
            log.debug("Office> alive")
            office_last_seen = time.time()
            set_office_on()
    if(office_state):
        threading.Timer(5, office_off_check).start()
    return

