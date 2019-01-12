#%%
import sys
import logging as log
import argparse
from time import sleep,time
import json
import socket
import os

# attempt for jupyter
#nb_dir = os.path.split(os.getcwd())[0]
#if nb_dir not in sys.path:
#    sys.path.append(nb_dir)
#from raspi.rf_uart.mqtt import mqtt_start
#import raspi.rf_uart.mesh as mesh
#import raspi.rf_uart.cfg as cfg

import mesh as mesh
import cfg
from mqtt import mqtt_start

this_node_id = 0

def mesh_do_action(cmd,remote,params):
    global this_node_id
    control = 0x71
    try:
        if(cmd == "dimmer"):
            #TODO
            log.info("action> dimmer TODO")
        elif(cmd == "ping"):
            mesh.send([ control,mesh.pid["ping"],this_node_id,int(remote)])
    except KeyError:
        log.error("mqtt_remote_req > KeyError Exception for %s",cmd)
    except ValueError:
        log.error("mqtt_remote_req > ValueError Exception for %s , '%s'",cmd, remote)
    return

def remote_execute_command(cmd,params):
    global this_node_id
    control = 0x21
    try:
        if(cmd == "set_channel"):
            mesh.send([ control,mesh.pid["exec_cmd"],this_node_id,int(params["remote"]),
                        mesh.exec_cmd[cmd],int(params["channel"])]
                    )
        elif(cmd == "get_channel"):
            mesh.send([ control,mesh.pid["exec_cmd"],this_node_id,int(params["remote"]),
                        mesh.exec_cmd[cmd]]
            )
        else:
            return False
    except (KeyError,TypeError):
        log.error("mqtt_remote_req > Error Exception for %s",cmd)
    return True

def execute_command(cmd,params):
    try:
        if(cmd == "set_node_id"):
            mesh.command(cmd,[int(params["node_id"])])
        elif(cmd == "get_node_id"):
            mesh.command(cmd)
        elif(cmd == "set_channel"):
            mesh.command(cmd,[int(params["channel"])])
        elif(cmd == "get_channel"):
            mesh.command(cmd)
        elif(cmd == "set_tx_power"):
            mesh.command(cmd,[int(params["tx_power"])])
        elif(cmd == "get_tx_power"):
            mesh.command(cmd)
        else:
            return False
    except KeyError:
        log.error("mqtt_req > KeyError Exception for %s",cmd)
    return True

def mqtt_publish_rf_message(msg):
    try:
        log_text = f'rf > src:{msg["src"]} - {mesh.node_name(msg["src"])} : pid={mesh.inv_pid[int(msg["pid"])]}'
        log.debug(log_text)
        log.debug(json.dumps(msg))
        if(config["mqtt"]["publish"]):
            publishing = mesh.publish(msg)
            for topic,payload in publishing.items():
                clientMQTT.publish(topic,payload)
                log.debug(f"publishing on : {topic} - msg= {json.dumps(msg)}")
    except KeyError :
        log.error(f"no pid,msg in {json.dumps(msg)}")
    return

'''It's important to provide the msg dictionnary here as it might be used in a multitude of ways
   by other modules
'''
def mesh_on_broadcast(msg):
    mqtt_publish_rf_message(msg)
    return

def node_log(msg):
    payload = json.dumps(msg)
    log_text = f'log >{payload}'
    log.debug(log_text)
    try:
        topic = "jNodes/"+msg["src"]+"/log"
    except KeyError:
        try:
            topic = "jNodes/"+msg["nodeid"]+"/log"
        except KeyError:
            log.error("Error> no node identifier")
    if(config["mqtt"]["publish"]):
        clientMQTT.publish(topic,payload)
    return

def mesh_on_message(msg):
    #ack explanation not required
    if("ack" in msg):
        log.info(   "ack > %s %s -> %s",
                    mesh.inv_pid[int(msg["pid"])],
                    msg["src"],
                    msg["dest"]
                    )
        topic = "Nodes/"+msg["src"]+"/ack"
        payload = 1
    else:
        mqtt_publish_rf_message(msg)
    return
''' the return mesntions if the logto the user is handled or if not
    the raw line will be logged
'''
def mesh_on_cmd_response(resp,is_remote):
    global this_node_id
    if(is_remote):
        topic = "remote_cmd/response/"+resp["cmd"]
    else:
        topic = "cmd/response/"+resp["cmd"]
    log.info(f"cmd_resp> {topic} : {json.dumps(resp)}")
    if(resp["cmd"] == "get_node_id"):
        this_node_id = int(resp["node_id"])
    return

def mqtt_on_message(client, userdata, msg):
    log.debug(f"mqtt> topic {msg.topic}")
    topics = msg.topic.split("/")
    if((len(topics) == 3) and (topics[2] == "rov")):
        cmd = json.loads(msg.payload)
        try:
            rov_bldc(cmd["alpha"],float(cmd["norm"]))
        except KeyError:
            log.error("mqtt> requires alpha and norm")
    return

def loop(nb):
    while(nb > 0):
        #sleep(0.05)
        mesh.run()
        nb = nb - 1
    return

def remote_set_channel(remote,chan):
    global this_node_id
    log.debug("remote_set_channel(nodeid %d @ chan %d)",remote,chan)
    control = 0x21
    mesh.send([control,mesh.pid["exec_cmd"],this_node_id,remote,mesh.exec_cmd["set_channel"],remote,chan])
    loop(2)
    return

def set_channel(chan):
    log.debug("cmd > set_channel: %d",chan)
    mesh.command("set_channel",[chan])
    loop(2)
    return
def get_channel():
    log.debug("cmd > get_channel()")
    mesh.command("get_channel",[])
    loop(2)
    return
def get_node_id():
    global this_node_id
    this_node_id = 0
    log.debug("cmd > get_node_id()")
    mesh.command("get_node_id",[])
    loop(5)
    return this_node_id


def ping(target_node):
    global this_node_id
    log.debug("msg > ping %d -> %d ",this_node_id,target_node)
    control = 0x70
    mesh.send([control,mesh.pid["ping"],this_node_id,target_node])
    loop(2)
    return

def rov_bldc(alpha, norm):
    global this_node_id
    target_node = int(config["bldc"]["nodeid"])
    log.debug(f"msg > bldc from {this_node_id} -> {target_node} set alpha = {alpha} ; norm = {norm}")
    control = 0x70
    if(norm > 1):
        norm = 1
    byte_alpha = int(alpha)
    byte_norm = int(norm * 255)
    mesh.send([control,mesh.pid["bldc"],this_node_id,target_node,byte_alpha,byte_norm])
    sleep(0.002)#workaround to slow down as UART dongle can't handle 2 successive messages
    return


def test1():
    remote_set_channel(74,2)
    set_channel(2)
    ping(74)
    loop_forever()
    return
# -------------------- main -------------------- 
#python client.py -p COM4 -n 24 -c 10
config = cfg.configure_log(__file__)

parser = argparse.ArgumentParser()
parser.add_argument("-c","--channel",default=10)
parser.add_argument("-f","--function",default="x")
args = parser.parse_args()

#TODO this have a default that comes from the config
#so that the command line can only override the config if required
chan = int(args.channel)

clientMQTT = mqtt_start(config,mqtt_on_message,True)

mesh.start(config,mesh_on_broadcast,mesh_on_message,mesh_on_cmd_response,node_log)

this_node_id = get_node_id()
if(this_node_id == 0):
    log.error("Error> cannot communicate with rf dongle")
    #exit(1)
else:
    log.info(f"dongle> nodeid = {this_node_id}")

#set_channel(chan)

#loop(10) #to get the node id

#rov_bldc(0,0.2)

while(True):
    mesh.run()

#bldc(75,37)
#loop(200)

#for i in range(5000):
#    bldc(75,i%256)
#    sleep(0.002)
