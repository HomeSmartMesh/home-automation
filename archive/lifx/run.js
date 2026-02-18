const fs = require('fs');
const {logger} = require('./logger.js')
const mqtt = require('./mqtt.js')
let config = JSON.parse(fs.readFileSync(__dirname+'/config.json'))

const Lifx  = require('node-lifx-lan');
const { discover } = require('node-lifx-lan/lib/lifx-lan-udp');
const { create } = require('domain');

const dns = require('dns')

async function dns_lookup(){
  return new Promise((resolve, reject) => {
      dns.lookup(config.lifx["curtain sun"].ip, (err, address, family) => {
          if(err) reject(err);
          resolve(address);
      });
 });
};

function defined(obj){
  return (typeof(obj) != "undefined")
}

let is_window_closed = false

let lifx = null

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

async function run_create(){
  lifx = await Lifx.createDevice({mac: 'D0:73:D5:40:98:88',ip: '10.0.0.11'})
}

function css_array_to_objects(colors){
  console.log(typeof colors)
  console.log(colors)
  let res = []
  colors.forEach((color)=>{
    res.push({css:color})
  })
  return res
}

function run_command(cmd,obj){

  if(lifx==null){
    console.error("lifx mqtt command before instance creation")
    return
  }
  //avoiding eval and expansion
  if(cmd == "tileSetTileState64"){
    let colors = css_array_to_objects(obj.colors)
    lifx.tileSetTileState64({tile_index:0,colors:colors})
  }
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

async function office_switch(msg){
  let message = JSON.parse(msg)
  if(defined(message.click) && (message.click == "single")){
    let result = await lifx.lightGet()
    if(result.power){
      logger.info("office button> (click)(power) => turning curtain off")
      await lifx.turnOff({duration: 2000})
    }else{
      logger.info("office button> (click)(no power) =>turning curtain on")
      await lifx.turnOn({duration: 1000})
    }
  }
}

//------------------ main ------------------
async function main(){
  logger.info('lifx led strip and panel service just started')
  logger.info('test info')
  logger.verbose('test verbose')
  logger.debug('test debug')
  logger.silly('test silly')
  // !! start only, will be connected after callback
  mqtt.start()

  mqtt.Emitter.on('mqtt',(data)=>{
      if(data.topic == "lzig/office button"){
        office_switch(data.msg).then()
      }
    })

  //if mqtt start would have been async, you could simply await it

    config.lifx["curtain sun"].ip = await dns_lookup()
    logger.info(`resolved ip to ${config.lifx["curtain sun"].ip}`)
    lifx = await Lifx.createDevice(config.lifx["curtain sun"])
  
}

main().then(console.log("main lunch done"))
