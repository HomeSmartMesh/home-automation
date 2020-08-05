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

function run_discover(){
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

function run_create(){
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

function test_sim1(){
  let payload = {
    colors:[
      "green", "green", "red", "red", "blue"
    ]
  }
  mqtt.publish(config.control.sim,JSON.stringify(payload))
}

function test_sim(){
  let colors = []
  for(let i=0;i<64;i++){
    let hex = ('00' + (i*4).toString(16).toUpperCase()).slice(-2);
    colors.push(`#0088${hex}`)
  }
  let payload = {colors:colors}
  mqtt.publish(config.control.sim,JSON.stringify(payload))
}

//------------------ main ------------------
async function main(){
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

  //if mqtt start would have been async, you could simply await it
  await delay(1000)
  //run_discover()
  //run_create()
  test_sim()
}

main().then(console.log("main lunch done"))
