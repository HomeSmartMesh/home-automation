const fs = require('fs');
const {logger} = require('./logger.js')
const mqtt = require('./mqtt.js')
const http = require('http')
const config = JSON.parse(fs.readFileSync(__dirname+'/config.json'))

let count_low = 0
let pc_reley_status = "nothing"
let retro_light_status = "nothing"
let retro_dimmer_status = {"alive":false,"list":[0,0,0,0,0,0,0,0]}

let auto_on_off = true
let sonos_off = true

function pc_shutdown(){
  logger.info(`pc> shutting down`)
  mqtt.publish(config.control.pc,'{"state":"OFF"}')
}

function call_low(){
  if(count_low < 10){
    count_low++
    logger.debug(`pc> count down ${count_low}`)
  }else{
    if(pc_reley_status == "ON"){
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

function retro_light(topic,message){
  if(message.hasOwnProperty("click")){
    logger.verbose(`retro light> ${topic} : click = ${message.click}`)
    if(message.click == "single"){
      if(retro_light_status == "off"){
        logger.info(`retro light> switching on`)
        mqtt.publish(config.control.retro_light_relay,"on")
      }else{
        logger.info(`retro light> switching off`)
        mqtt.publish(config.control.retro_light_relay,"off")
      }
    }
  }else if(topic == config.status.retro_light_relay){
    logger.debug(`retro light> relay : ${message}`)
    retro_light_status = message
  }else if(topic == config.status.retro_light_dimmer){
    if(message.hasOwnProperty("alive")){
      logger.info(`retro light> dimmer : ${JSON.stringify(message)}`)
      if(message.alive == true){
        if(message.list[0] == 800){
          mqtt.publish(config.control.retro_light_dimmer,`{"all":3000}`)
        }
      }
      retro_dimmer_status = message
    }
  }
}

function sonos_button(topic,message){
  if(message.hasOwnProperty("click")){
    logger.verbose(`sonos> ${topic} : click = ${message.click}`)
    if(message.click == "single"){
      if(sonos_off){
        logger.info(`sonos> switching on`)
        mqtt.publish(config.control.sonos_front,'{"state":"ON"}')
        mqtt.publish(config.control.sonos_rear,'{"state":"ON"}')
        sonos_off = false
      }else{
        logger.info(`sonos> switching off`)
        mqtt.publish(config.control.sonos_front,'{"state":"OFF"}')
        mqtt.publish(config.control.sonos_rear,'{"state":"OFF"}')
        sonos_off = true
      }
    }
  }
}

function pc_button(topic,message){
  //when user interacts, reset automation counter
  count_low = 0
  if(message.hasOwnProperty("click")){
    logger.verbose(`pc> ${topic} : click = (${message.click})`)
    if(message.click == "single"){
      if(pc_reley_status == "ON"){
        logger.info(`pc> is on and click => shutting off`)
        mqtt.publish(config.control.pc,'{"state":"OFF"}')
      }else if(pc_reley_status == "OFF"){
        logger.info(`pc> is off and click => turning on`)
        mqtt.publish(config.control.pc,'{"state":"ON"}')
      }
      else{
        logger.error(`No state in pc_reley_status : ${pc_reley_status}`)
      }
    }
  }
}

function office_chair_vibration(topic,message){
  if(message.hasOwnProperty("action")){
    logger.verbose(`pc> ${topic} : action = ${message.action}`)
    if((message.action == "tilt") || (message.action == "vibration")){
      if(auto_on_off){
        logger.info(`pc> chair moved - auto_on_off => switching on`)
        mqtt.publish(config.control.pc,'{"state":"ON"}')
      }else{
        logger.info(`pc> chair moved - but auto_on_off false => No action taken`)
      }
    }
  }
}

mqtt.Emitter.on('mqtt',(data)=>{
  try{
    if(data.topic == config.status.pc){
      const jvals = JSON.parse(data.msg)
      pc_reley_status = jvals.state
      logger.debug(`pc_reley_status updated to ${pc_reley_status}`)
      if(jvals.power <10){
        call_low()
      }else{
        call_high()
      }
    }else if(data.topic == "lzig/pc button"){
      pc_button(data.topic,JSON.parse(data.msg))
    }else if(data.topic == "lzig/sonos button"){
      sonos_button(data.topic,JSON.parse(data.msg))
    }else if(data.topic == "lzig/office chair vibration"){
      office_chair_vibration(data.topic,JSON.parse(data.msg))
    }else if(data.topic == config.status.retro_light_relay){
      retro_light(data.topic,data.msg)
    }else if(data.topic == config.status.retro_light_dimmer){
      retro_light(data.topic,JSON.parse(data.msg))
    }else if(data.topic == "lzig/retro button"){
      retro_light(data.topic,JSON.parse(data.msg))
    }
  }catch(e){
    logger.info(`pc> Handling all exceptions : ${e.message}`)
  }
})

//winston has it
//process.on('uncaughtException', (err) => {
//  console.error('There was an uncaught error', err)
//  process.exit(1) //mandatory (as per the Node docs)
//})
