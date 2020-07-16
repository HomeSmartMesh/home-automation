const fs = require('fs');
const {logger} = require('./logger.js')
const mqtt = require('./mqtt.js')
const http = require('http')
const config = JSON.parse(fs.readFileSync(__dirname+'/config.json'))

let count_low = 0
let pc_reley_status = "nothing"
let auto_off = true

function roll_command(cmd){
  mqtt.publish(config.control.roll,cmd)
}

//------------------ main ------------------
logger.info('window blind roll service just started')
logger.info('test info')
logger.verbose('test verbose')
logger.debug('test debug')
logger.silly('test silly')
mqtt.start()

function roll_buttons(topic,message){
  const msg = String(message)
  if(["on","open","brightness_up"].includes(msg)){
    logger.info(`roll> ${topic}  '${msg}' => open`)
    roll_command("open")
  }else if(["off","close","brightness_down"].includes(msg)){
    logger.info(`roll> ${topic}  '${msg}' => close`)
    roll_command("close")
  }else if(["release","brightness_stop"].includes(msg)){
    logger.info(`roll> ${topic}  '${msg}' => stop`)
    roll_command("stop")
  }
}

mqtt.Emitter.on('mqtt',(data)=>{
  if(data.topic == "lzig/roll button 1/click"){
    roll_buttons(data.topic,data.msg)
  }else if(data.topic == "lzig/roll button 2/click"){
    roll_buttons(data.topic,data.msg)
  }
})

