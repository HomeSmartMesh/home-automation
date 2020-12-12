const http = require('http')
const {logger} = require('./logger.js')

//------------------ main ------------------
logger.info('rebooting devices started')

http.request("http://192.168.0.100/reboot").end()
http.request("http://192.168.0.103/reboot").end()
http.request("http://10.0.0.40/reboot").end()
http.request("http://192.168.0.101/reboot").end()
http.request("http://192.168.0.102/reboot").end()
http.request("http://192.168.0.104/reboot").end()
http.request("http://192.168.0.105/reboot").end()
http.request("http://192.168.0.108/reboot").end()
http.request("http://192.168.0.106/reboot").end()
http.request("http://192.168.0.109/reboot").end()
http.request("http://192.168.0.107/reboot").end()
http.request("http://10.0.0.54/reboot").end()
http.request("http://10.0.0.49/reboot").end()
http.request("http://10.0.0.18/reboot").end()

logger.info('rebooting devices complete')
