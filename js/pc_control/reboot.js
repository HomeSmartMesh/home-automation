const http = require('http')
const {logger} = require('./logger.js')

//------------------ main ------------------
logger.info('rebooting devices started')

http.request("http://sonos_front.shelly/reboot").end()
http.request("http://strong.shelly/reboot").end()
http.request("http://dell_pc.shelly/reboot").end()
http.request("http://retro.shelly/reboot").end()
http.request("http://bathroom.shelly/reboot").end()
http.request("http://sonos_sat.shelly/reboot").end()
http.request("http://micro_wave.shelly/reboot").end()
http.request("http://dryer.shelly/reboot").end()
http.request("http://waching_machine.shelly/reboot").end()
http.request("http://entrance.shelly/reboot").end()
http.request("http://dish_washer.shelly/reboot").end()
http.request("http://sonos_sat.shelly/reboot").end()
http.request("http://fridge.shelly/reboot").end()
http.request("http://tv_set.shelly/reboot").end()
http.request("http://freezer.shelly/reboot").end()
http.request("http://routers.shelly/reboot").end()

logger.info('rebooting devices complete')
