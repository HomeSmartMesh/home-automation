const fs = require('fs');
const {logger} = require('./logger.js')
const mqtt = require('./mqtt.js')
const http = require('http');
const { stringify } = require('querystring');
const config = JSON.parse(fs.readFileSync(__dirname+'/config.json'))

let control = false
let position = 50
let target_position = 50

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

function roll_buttons(topic,msg){
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

function roll_volume_move(topic,message){
  if(message.hasOwnProperty("brightness")){
    logger.verbose(`volume> ${topic} : ${message}`)
  }
}

function roll_volume_control(topic,msg){
  if(msg == "rotate_left"){
    target_position +=5
    //logger.verbose(`volume control> start`)
    control = true
  }else if(msg == "rotate_right"){
    target_position -=5
    //logger.verbose(`volume control> stop`)
    control = true
  }else if(msg == "rotate_stop"){
    logger.verbose(`requestion position> ${target_position}`)
    roll_command(JSON.stringify({position:target_position}))
    control = false
  }
}

function roll_position(topic,message){
  if(message.hasOwnProperty("position")){
    position = parseInt(message.position)
    logger.verbose(`position> ${position}`)
    if(!control){
      target_position = position
    }
  }
}

mqtt.Emitter.on('mqtt',(data)=>{
  if(data.topic == "lzig/roll button 1/click"){
    roll_buttons(data.topic,String(data.msg))
  }else if(data.topic == "lzig/roll button 2/click"){
    roll_buttons(data.topic,String(data.msg))
  }else if(data.topic == "lzig/volume white"){
    //roll_volume_move(data.topic,JSON.parse(data.msg))
  }else if(data.topic == "lzig/volume white/action"){
    roll_volume_control(data.topic,String(data.msg))
  }else if(data.topic == "lzig/bedroom roll"){
    roll_position(data.topic,JSON.parse(data.msg))
  }
})

