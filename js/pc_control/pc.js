const fs = require('fs');
const {logger} = require('./logger.js')
const mqtt = require('./mqtt.js')
const http = require('http')
const config = JSON.parse(fs.readFileSync(__dirname+'/config.json'))

let count_low = 0
let pc_reley_status = "nothing"
let auto_on_off = true

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
logger.info('test info')
logger.verbose('test verbose')
logger.debug('test debug')
logger.silly('test silly')
mqtt.start()

function sonos_button(topic,message){
  if(message.hasOwnProperty("click")){
    logger.verbose(`sonos> ${topic} : click = ${message.click}`)
    if(message.click == "single"){
        logger.info(`sonos> switching on`)
        mqtt.publish(config.control.sonos_front,"on")
        mqtt.publish(config.control.sonos_rear,"on")
    }else if(message.click == "double"){
      logger.info(`sonos> switching off`)
      mqtt.publish(config.control.sonos_front,"off")
      mqtt.publish(config.control.sonos_rear,"off")
    }
  }
}
function pc_button(topic,message){
  //when user interacts, reset automation counter
  count_low = 0
  if(message.hasOwnProperty("click")){
    logger.verbose(`pc> ${topic} : click = (${message.click})`)
    if(message.click == "single"){
      if(pc_reley_status == "on"){
        logger.info(`pc> is on and click => shutting off`)
        mqtt.publish(config.control.pc,"off")
        mqtt.publish(config.control.repeater,"off")
      }else if(pc_reley_status == "off"){
        logger.info(`pc> is off and click => turning on`)
        mqtt.publish(config.control.pc,"on")
        mqtt.publish(config.control.repeater,"on")
      }
    }else if(message.click == "double"){
      auto_on_off = !auto_on_off
      if(auto_on_off){
        http.request(config.control.led.on).end()
      }else{
        http.request(config.control.led.off).end()
      }
    }
  }else if(message.hasOwnProperty("action")){
    if(message.action == "hold"){
      mqtt.publish(config.control.repeater,"off")
    }else if(message.action == "release"){
      mqtt.publish(config.control.repeater,"on")
    }
  }
}

function office_chair_vibration(topic,message){
  if(message.hasOwnProperty("action")){
    logger.verbose(`pc> ${topic} : action = ${message.action}`)
    if((message.action == "tilt") || (message.action == "vibration")){
      if(auto_on_off){
        logger.info(`pc> chair moved - auto_on_off => switching on`)
        mqtt.publish(config.control.pc,"on")
        mqtt.publish(config.control.repeater,"on")
      }else{
        logger.info(`pc> chair moved - but auto_on_off false => No action taken`)
      }
    }
  }
}

mqtt.Emitter.on('mqtt',(data)=>{
  if(data.topic == "shellies/shellyplug-s-B85CCA/relay/0/power"){
    if(auto_on_off){
      const power = parseFloat(data.msg)
      if(power <10){
        call_low()
      }else{
        call_high()
      }
    }
  }else if(data.topic == "shellies/shellyplug-s-B85CCA/relay/0"){
    pc_reley_status = data.msg
  }else if(data.topic == "mzig/pc button"){
    pc_button(data.topic,JSON.parse(data.msg))
  }else if(data.topic == "mzig/sonos button"){
    sonos_button(data.topic,JSON.parse(data.msg))
  }else if(data.topic == "mzig/office chair vibration"){
    office_chair_vibration(data.topic,JSON.parse(data.msg))
  }
})

//auto_on_off starts true => on
http.request(config.control.led.on).end()

//winston has it
//process.on('uncaughtException', (err) => {
//  console.error('There was an uncaught error', err)
//  process.exit(1) //mandatory (as per the Node docs)
//})
