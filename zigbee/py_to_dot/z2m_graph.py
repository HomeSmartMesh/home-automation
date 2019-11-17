import sys
import logging as log
from time import sleep,time
import json
from mqtt import mqtt_start
import cfg
from graphviz import Source
from datetime import datetime


def mqtt_on_message(client, userdata, msg):
    now = datetime.now()
    now_text = now.strftime("%Y.%m.%d %Hh%M")
    log.info("mqtt> message")
    topics = msg.topic.split('/')
    if(len(topics) == 4 and topics[3] == "graphviz"):
        server_name = topics[0]
        log.info(f"graph received for '{server_name}'")
        #'dot', 'neato', 'circo', 'sfdp'
        if(topics[0] == 'mzig'):
            engine_name = "fdp"
        elif(topics[0] == 'hzig'):
            engine_name = "dot"
        elif(topics[0] == 'lzig'):
            engine_name = "circo"
        else:
            print(f"unexpected server name : {topics[0]}")
            engine_name = "dot"
        graph_text = msg.payload.decode()
        graph_text.replace("Custom devices (DiY) [CC2530 router](http://ptvo.info/cc2530-based-zigbee-coordinator-and-router-112/) (CC2530.ROUTER)","CC2530.CC2591.ROUTER")
        g = Source(graph_text,format='svg',engine=engine_name)
        g.render("graphs\\"+now_text+" "+server_name+" "+engine_name+".dot", view=True)
        if(topics[0] == 'lzig'):
            sys.exit(0)
    return

def loop_forever():
    while(True):
        sleep(0.1)
        if(config["mqtt"]["enable"]):
            clientMQTT.loop()
    return

def user_mqtt_on_connect():
    clientMQTT.publish("mzig/bridge/networkmap","graphviz")
    clientMQTT.publish("lzig/bridge/networkmap","graphviz")
    #clientMQTT.publish("hzig/bridge/networkmap","graphviz")
    return

# -------------------- main -------------------- 
#python client.py -p COM4 -n 24 -c 10
config = cfg.configure_log(__file__)

#will not start a separate thread for looping
clientMQTT = mqtt_start(config,mqtt_on_message,user_mqtt_on_connect,start_looping=False)


try:
    loop_forever()
except KeyboardInterrupt:
    log.error("Interrupted by user Keyboard")
    sys.exit(0)
#else use as a module
