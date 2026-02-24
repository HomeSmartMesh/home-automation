const fs = require('fs');
const config = require('./config_loader.js')
const {logger} = require('./logger.js')
const mqtt = require('./mqtt.js')
const { createFanout } = require('./fanout.js')
//const events = require('events')
//const Emitter = new events.EventEmitter()

const startup_time = Date.now()
let last_nrf = Date.now()
let nrf_alerted = false

let topics_map = {}

function load_secrets(){
  const candidates = [
    __dirname + '/secrets.json',
  ]
  for(const path of candidates){
    try{
      if(fs.existsSync(path)){
        return JSON.parse(fs.readFileSync(path))
      }
    }catch(e){
      logger.warn(`failed to read secrets file ${path}: ${e}`)
      return null
    }
  }
  logger.warn(`no secrets file found (expected one of: ${candidates.join(', ')})`)
  return null
}

const secrets = load_secrets()
const publishers = createFanout({ logger, config, secrets, mqtt })
publishers.start()

function last_seen_fresh(date){
  let now = Date.now()
  if((now- date) > 2000){
    logger.debug(`(${now})-(${date}) seen ${now- date} ms ago`)
    return false
  }else{
    return true
  }
}

function alert(msg){
  logger.info(`⚠ ${msg}`)
  publishers.publish('alert', { text: msg })
}

function info(msg){
  logger.info(`ℹ ${msg}`)
  publishers.publish('info', { text: msg })
}


function init_topics_map(){
  let now = Date.now()
  for(let [key,list] of Object.entries(config.mqtt.lists)){
    list.forEach((topic)=>{
      topics_map[topic] = {list:key,connection_status:"initial",battery_status:"initial"}
    })
  }
}

function check_topics_alive(){
  let now = Date.now()
  let nrf_age_minutes = (now - last_nrf)/(60*1000)
  
  const nrf_threshold = config.alive_minutes_list ? config.alive_minutes_list.nrf : undefined
  if((typeof nrf_threshold === "number") && (nrf_age_minutes > nrf_threshold) && (nrf_alerted == false)){
    alert(` ⏳ nrf > not seen for ${(nrf_age_minutes).toFixed(0)} minutes`)
    nrf_alerted = true
  }else{
    logger.verbose(`no alert: nrf age = ${nrf_age_minutes} minutes`)
  }
  for(let [topic,params] of Object.entries(topics_map)){
    let age_ms =params.hasOwnProperty("last_seen")?now - params.last_seen:now - startup_time
    const minutes = config.alive_minutes_sensor ? config.alive_minutes_sensor[params.list] : undefined
    if(typeof minutes !== "number"){
      logger.warn(`missing alive_minutes_sensor for list '${params.list}' (topic: ${topic})`)
      continue
    }
    let cfg_alive_ms = minutes*60*1000
    logger.verbose(`age:${(age_ms/(60*1000)).toFixed(1)} min ;config:${(cfg_alive_ms/(60*1000)).toFixed(1)}\tstatus:${params.connection_status} ; list:${params.list} ; ${topic}`)
    if((age_ms > cfg_alive_ms)&&(params.connection_status != "alerted")){
      alert(` ⏳ ${topic}> not seen for ${(age_ms/(60*1000)).toFixed(0)} minutes`)
      params.connection_status = "alerted"
    }
  }
}


function watch_topics(data){
  if(!topics_map.hasOwnProperty(data.topic)){
    logger.debug(`ignoring unexpected topic: ${data.topic}`)
    return
  }
  if(!data || !data.msg || typeof data.msg !== "object"){
    logger.debug(`ignoring invalid mqtt payload for ${data.topic}`)
    return
  }

  let list = topics_map[data.topic].list
  if(list == "nrf"){
    last_nrf = Date.now()
    if(nrf_alerted){
      info(` ⏳ nrf > back online `)
      nrf_alerted = false
    }else{
      logger.debug(`nrf > upate`)
    }
  }
  if(!data.msg.hasOwnProperty("last_seen")){
    let last_seen = Date.now();
    topics_map[data.topic].last_seen = last_seen
  }
  else{
    let last_seen = new Date(Date.parse(data.msg.last_seen));
    //no stats will be processed in the watch
    topics_map[data.topic].last_seen = last_seen
    if(!last_seen_fresh(last_seen)){
      logger.debug(`last seen not fresh : ${data.topic}`)
      //discard further processing for watch checks as the values is deprecated
      return
    }else{
      logger.verbose(`last_seen update for '${data.topic}'`)
      if(topics_map[data.topic].connection_status == "alerted"){
        topics_map[data.topic].connection_status = "online"
        info(`${data.topic}> back online`)
      }
    }
  }
  if(!config.watch.hasOwnProperty(list)){ //allows topics that have alive only
    return
  }
  for(let [sensor,watch_params] of Object.entries(config.watch[list])){
    if(data.msg.hasOwnProperty(sensor)){
      let value = data.msg[sensor]
      if(watch_params.hasOwnProperty("minimum")){
        if (value < watch_params.minimum){
          if(topics_map[data.topic].battery_status != "alerted"){
            alert(`${data.topic}>🔋 ${sensor} = ${value} is below minimum ${watch_params.minimum}`)
            topics_map[data.topic].battery_status = "alerted"
          }
        }else if (value > watch_params.back){
          if(topics_map[data.topic].battery_status == "alerted"){
            info(`${data.topic}> ${sensor} = ${value} back above minimum ${watch_params.minimum}`)
            topics_map[data.topic].battery_status = "healthy"
          }
        }
      }
    }
  }
}

//------------------ main ------------------
init_topics_map()
mqtt.Emitter.on('mqtt',(data)=>{
  try{
    watch_topics(data)
  }catch(e){
    logger.warn(`watch_topics failed for topic '${data && data.topic ? data.topic : "unknown"}': ${e}`)
  }
})
mqtt.start()

const first_run_delay_ms = 10000
const run_prediod_ms = 10000
setTimeout(()=>{
    setInterval(check_topics_alive,run_prediod_ms)
  },
  first_run_delay_ms
)
