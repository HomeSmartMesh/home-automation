const fs = require('fs')
const mqtt = require('mqtt')
const {logger} = require('./logger.js')
const events = require('events')
const Emitter = new events.EventEmitter()

const config = JSON.parse(fs.readFileSync(__dirname+'/config.json'))
var client;

const options = {qos:2, retain:false}

function onConnect() {
  config.mqtt.subscriptions.forEach((topic)=>{
    client.subscribe(topic)
  })
  logger.info("onConnect");
}

function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    logger.warn("onConnectionLost:"+responseObject.errorMessage);
  }
}

function onMessageArrived(topic,message) {
  logger.debug(`mqtt> ${topic} : ${message}`);
  Emitter.emit('mqtt',{topic:topic,msg:message});
}

function start(){
  logger.info(`creating client connection to ${config.mqtt.host}:${config.mqtt.port}`);
  client = mqtt.connect(`mqtt://${config.mqtt.host}:${config.mqtt.port}`);//unused config.mqtt.clien_id
  client.on('connect',onConnect);
  //client.onConnectionLost = onConnectionLost;
  client.on('message',onMessageArrived);

}

function publish(topic,message){
  client.publish(topic,message,options)
}
//----------------------------------------------------------------------------------
module.exports = {start,Emitter,publish}
