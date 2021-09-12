const http = require('http')
const {logger} = require('./logger.js')

//------------------ main ------------------
logger.info('rebooting devices started')

http.request("http://10.0.0.46/reboot").end()
http.request("http://10.0.0.47/reboot").end()
http.request("http://10.0.0.40/reboot").end()
http.request("http://10.0.0.55/reboot").end()
http.request("http://10.0.0.59/reboot").end()
http.request("http://10.0.0.45/reboot").end()
http.request("http://10.0.0.51/reboot").end()
http.request("http://10.0.0.62/reboot").end()
http.request("http://10.0.0.21/reboot").end()
http.request("http://10.0.0.48/reboot").end()
http.request("http://10.0.0.12/reboot").end()
http.request("http://10.0.0.50/reboot").end()
http.request("http://10.0.0.54/reboot").end()
http.request("http://10.0.0.18/reboot").end()
http.request("http://10.0.0.58/reboot").end()

logger.info('rebooting devices complete')
