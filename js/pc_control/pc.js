const fs = require('fs');
const {logger} = require('./logger.js')
const mqtt = require('./mqtt.js')
const config = JSON.parse(fs.readFileSync(__dirname+'\\config.json'))

//------------------ main ------------------
logger.info('pc control started')
mqtt.start()

mqtt.Emitter.on('mqtt',(data)=>{
  if(data.msg.hasOwnProperty("click")){
    logger.verbose(`pc> ${data.topic} : click = ${data.msg.click}`)
    if(data.msg.click == "single"){
      logger.info(`pc> switching control on`)
      mqtt.publish(config.control.pc,"on")
      mqtt.publish(config.control.repeater,"on")
    }
  }
})
