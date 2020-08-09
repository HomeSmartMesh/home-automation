const fs = require('fs')
const mqtt = require('mqtt')
const {logger} = require('./logger.js')
const events = require('events')
const Emitter = new events.EventEmitter()

const config = JSON.parse(fs.readFileSync(__dirname+'\\config.json'))
var client;

function onConnect() {
  for(let [key,list] of Object.entries(config.mqtt.lists)){
    list.forEach((topic)=>{
      client.subscribe(topic)
    })
  }

  logger.info("onConnect");
}

function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    logger.warn("onConnectionLost:"+responseObject.errorMessage);
  }
}

function onMessageArrived(topic,message) {
  logger.debug(`mqtt> ${topic} : ${message}`);
  Emitter.emit('mqtt',{topic:topic,msg:JSON.parse(message)});
}

function start(){
  logger.info(`creating client connection to ${config.mqtt.host}:${config.mqtt.port}`);
  client = mqtt.connect(`mqtt://${config.mqtt.host}:${config.mqtt.port}`);//unused config.mqtt.clien_id
  client.on('connect',onConnect);
  //client.onConnectionLost = onConnectionLost;
  client.on('message',onMessageArrived);

}

//----------------------------------------------------------------------------------
module.exports = {start,Emitter}
