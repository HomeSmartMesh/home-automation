import cfg
import thread_tags_homeassistant
import thread_tags_mqtt

config = cfg.configure_log(__file__)
if(config["homeassistant"]):
    thread_tags_homeassistant.run()
else:
    thread_tags_mqtt.run()
