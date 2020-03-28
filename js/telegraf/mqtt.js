const fs = require('fs');
const Paho = require('paho-mqtt')
const {logger} = require('./logger.js')

const config = JSON.parse(fs.readFileSync(__dirname+'\\config.json'))
var client;

var topics = {
  lifo:"/bridge/networkmap",
  mano:"/bridge/networkmap",
  response:"+/bridge/networkmap/graphviz"
}

function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
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

function onMessageArrived(message) {
  logger.debug(`${message.destinationName} : ${message.payloadString}`);
}

function start(){
  logger.info(`creating client connection to ${config.mqtt.host}:${config.mqtt.port}`);
  client = new Paho.Client(config.mqtt.host, Number(config.mqtt.port), config.mqtt.clien_id);
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  client.connect({onSuccess:onConnect});
}

//----------------------------------------------------------------------------------
module.exports = {start}
