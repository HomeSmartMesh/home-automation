import sys,os
import json
import logging as log
import socket
from collections import OrderedDict
import datetime

from platform   import system as system_name  # Returns the system/OS name
from subprocess import call   as system_call  # Execute a shell command

def ping(host):
    """
    Returns True if host (str) responds to a ping request.
    Remember that a host may not respond to a ping (ICMP) request even if the host name is valid.
    """

    # Ping command count option as function of OS
    param = '-n' if system_name().lower()=='windows' else '-c'

    # Building the command. Ex: "ping -c 1 google.com"
    command = ['ping', param, '1', host]

    # Pinging
    return system_call(command) == 0

# -------------------- config -------------------- 
def get_local_json():
    """fetches the config.json file in the local directory
       if config_hostname.json is found it is used over the default one
    """
    config = None
    dirname = os.path.dirname(sys.argv[0])
    if(len(dirname) == 0):
        dirname = "."
    config_file = dirname+'/'+"config_"+socket.gethostname()+".json"
    if(os.path.isfile(config_file)):
        print("loading: ",config_file)
        config = json.load(open(config_file))
    else:
        config_file = dirname+'/'+"config.json"
        if(os.path.isfile(config_file)):
            print("loading: %s",config_file)
            config = json.load(open(config_file))
        else:
            print("Fatal error 'config.json' not found")
    return config

# -------------------- config -------------------- 
def get_local_nodes(nodes_file):
    nodes = json.load(open(nodes_file),object_pairs_hook=OrderedDict)
    return nodes

def configure_log(logger_name):
    global_config = get_local_json()
    config = global_config["log"]
    log_level_map = {
        "Debug"     :10,
        "Info"      :20,
        "Warning"   :30,
        "Error"     :40,
        "Critical"  :50
    }
    #if(os.path.isfile(config["logfile"])):
    logfile = config["logfile"].replace("(date)",datetime.datetime.now().strftime('-%Y.%m.%d'))
    log.info(f"logging in file '{logfile}'")
    for handler in log.root.handlers[:]:
        log.root.removeHandler(handler)
    log.basicConfig(    filename=logfile,
                        level=log_level_map[config["level"]],
                        format='%(asctime)s %(name)s %(levelname)-8s %(message)s',
                        datefmt='%Y-%m-%d %H:%M:%S'
                        )
    log.getLogger('').addHandler(log.StreamHandler())
    log.info("====> '%s' started logging with level '%s' @ '%s'"%(logger_name,config["level"],str(datetime.datetime.utcnow())))
    #else:
    #    print("Log file not available : %s"%(config["logfile"]))
    return global_config
