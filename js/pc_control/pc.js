const fs = require('fs');
const {logger} = require('./logger.js')
const mqtt = require('./mqtt.js')
const config = JSON.parse(fs.readFileSync(__dirname+'/config.json'))

let count_low = 0
let pc_reley_status = "nothing"

function pc_shutdown(){
  logger.info(`pc> shutting down`)
  mqtt.publish(config.control.pc,"off")
  mqtt.publish(config.control.repeater,"off")
}

function call_low(){
  if(count_low < 10){
    count_low++
    logger.debug(`pc> count down ${count_low}`)
  }else{
    if(pc_reley_status == "on"){
      pc_shutdown()
      count_low = 0
    }
    //else do nothing skip counting the off time, as it might be long - saving energy
  }
}

function call_high(){
  count_low = 0;
}

//------------------ main ------------------
logger.info('pc control with shutdown capability started')
mqtt.start()

mqtt.Emitter.on('mqtt',(data)=>{
  if(data.topic == "shellies/shellyplug-s-6A6375/relay/0/power"){
    const power = parseFloat(data.msg)
    if(power <10){
      call_low()
    }else{
      call_high()
    }
  }else if(data.topic == "shellies/shellyplug-s-6A6375/relay/0"){
    pc_reley_status = data.msg
  }else if(data.topic == "mzig/pc button"){
    const message = JSON.parse(data.msg)
    if(message.hasOwnProperty("click")){
      logger.verbose(`pc> ${data.topic} : click = ${message.click}`)
      if(message.click == "single"){
        if(pc_reley_status = "on"){
          logger.info(`pc> is on and click => shutting off`)
          mqtt.publish(config.control.pc,"off")
          mqtt.publish(config.control.repeater,"off")
        }else if(pc_reley_status = "off"){
          logger.info(`pc> is off and click => turning on`)
          mqtt.publish(config.control.pc,"on")
          mqtt.publish(config.control.repeater,"on")
        }
      }
    }else if(message.hasOwnProperty("action")){
      if(message.action == "hold"){
        mqtt.publish(config.control.repeater,"off")
      }else if(message.action == "release"){
        mqtt.publish(config.control.repeater,"on")
      }
    }
  }else if(data.topic == "mzig/office chair vibration"){
    const message = JSON.parse(data.msg)
    if(message.hasOwnProperty("action")){
      logger.verbose(`pc> ${data.topic} : action = ${message.action}`)
      if((message.action == "tilt") || (message.action == "vibration")){
        logger.info(`pc> chair moved`)
        mqtt.publish(config.control.pc,"on")
        mqtt.publish(config.control.repeater,"on")
      }
    }
  }
})

//winston has it
//process.on('uncaughtException', (err) => {
//  console.error('There was an uncaught error', err)
//  process.exit(1) //mandatory (as per the Node docs)
//})
