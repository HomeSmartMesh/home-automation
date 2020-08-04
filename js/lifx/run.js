const fs = require('fs');
const {logger} = require('./logger.js')
const mqtt = require('./mqtt.js')
const config = JSON.parse(fs.readFileSync(__dirname+'/config.json'))

const Lifx  = require('node-lifx-lan');
const { discover } = require('node-lifx-lan/lib/lifx-lan-udp');
const { create } = require('domain');

let is_window_closed = false

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function roll_down_up(){
  mqtt.publish(config.control.roll,JSON.stringify({position:97}))
  await delay(1000)
  mqtt.publish(config.control.roll,"open")
}

function window_state(topic,message){
  console.log(`updating window state closed = ${message.contact}`)
  if(is_window_closed != message.contact){
    is_window_closed = message.contact
  }
}

function discover(){
  Lifx.discover().then((device_list) => {
    device_list.forEach((device) => {
      logger.debug([
        device['ip'],
        device['mac'],
        device['deviceInfo']['label']
      ].join(' | '));
    });
    device_list.forEach((device) => {
      logger.verbose(device);
    });
  }).catch((error) => {
    console.error(error);
  });
}

function create(){
  Lifx.createDevice({
    mac: 'D0:73:D5:25:36:B0',
    ip: '192.168.11.32'
  }).then((dev) => {
    return dev.turnOn({
      color: { css: 'red' }
    });
  }).then(() => {
    console.log('Done!');
  }).catch((error) => {
    console.error(error);
  });
}

//------------------ main ------------------
logger.info('lifx led strip and panel service just started')
logger.info('test info')
logger.verbose('test verbose')
logger.debug('test debug')
logger.silly('test silly')
mqtt.start()

mqtt.Emitter.on('mqtt',(data)=>{
  if(data.topic == "lzig/office switch"){
    logger.info("click on office switch")
  }
})

discover()
//create()