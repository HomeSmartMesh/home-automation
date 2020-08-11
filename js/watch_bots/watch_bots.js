const fs = require('fs');
const Telegraf = require('telegraf')
const {logger} = require('./logger.js')
const mqtt = require('./mqtt.js')
const Markup = require('telegraf/markup')
//const events = require('events')
//const Emitter = new events.EventEmitter()

let sensor_bot = null
const secrets = JSON.parse(fs.readFileSync(__dirname+'/secrets.json'))
const config = JSON.parse(fs.readFileSync(__dirname+'/config.json'))
const startup_time = Date.now()
let last_nrf = Date.now()
let nrf_alerted = false

let topics_map = {}

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
  sensor_bot.telegram.sendMessage(secrets.bots.sensors_watch_bot.chatId,`⚠ ${msg}`)
}

function info(msg){
  logger.info(`ℹ ${msg}`)
  sensor_bot.telegram.sendMessage(secrets.bots.sensors_watch_bot.chatId,`ℹ ${msg}`)
}



function run_bot_smart_hover(){
  function start(ctx){
    logger.info({from:ctx.from})
    logger.info({chat:ctx.chat})
    if(secrets.users.includes(ctx.from.id)){
          ctx.reply(`Hello! ${ctx.message.from.first_name}`)
          logger.debug({message:ctx.message})
      }else{
          ctx.reply(`I don't know you yet, ${ctx.message.from.first_name}`)
          logger.warn({unauthorised_user:ctx.from})
      }
  }

  const token = secrets.bots.smart_hover_bot.token
  const bot = new Telegraf(token)
  
  bot.start(start)
  bot.command('goto_clean_zone', ({ reply }) =>reply('Going to clean zone'))
  bot.command('clean_livingroom', ({ reply }) =>reply('Starting the livingroom cleaning'))
  bot.command('clean_kitchen', ({ reply }) =>reply('The kitchen is already clean 🍽️'))
  bot.command('clean_bedroom', ({ reply }) =>reply('The bedroom is already clean 🛏️'))
  
  bot.hears('clean', (ctx) =>
    ctx.reply('Which room would you like to clean ❓', Markup
      .keyboard(['/clean_livingroom', '/clean_kitchen', '/clean_bedroom'])
      .oneTime()
      .resize()
      .extra()
    )
  )
  
  bot.help((ctx) => ctx.reply('How can I help you ❓'))
  bot.hears('hi', (ctx) => ctx.reply('Hey there 👋'))
  mqtt.Emitter.on('mqtt',(data)=>{
    if(data.msg.hasOwnProperty("click")){
      logger.verbose(`bot> ${data.topic} : click = ${data.msg.click}`)
      bot.telegram.sendMessage(secrets.bots.smart_hover_bot.chatId,`button clicked ${data.msg.click}`)
    }
  })

  bot.launch()
  logger.info('smart_hover_bot started')
}

function init_topics_map(){
  let now = Date.now()
  for(let [key,list] of Object.entries(config.mqtt.lists)){
    list.forEach((topic)=>{
      topics_map[topic] = {list:key,status:"initial"}
    })
  }
}

function check_topics_alive(){
  let now = Date.now()
  let nrf_age_minutes = (now - last_nrf)/(60*1000)
  
  if(nrf_age_minutes > config.alive_minutes_list.nrf){
    alert(` ⏳ nrf > not seen for ${(nrf_age_minutes).toFixed(0)} minutes`)
    nrf_alerted = true
  }else{
    logger.verbose(`no alert: nrf age = ${nrf_age_minutes} minutes`)
  }
  logger.info(`----------- ages ---------------`)
  for(let [topic,params] of Object.entries(topics_map)){
    let age_ms =params.hasOwnProperty("last_seen")?now - params.last_seen:now - startup_time
    let cfg_alive_ms = config.alive_minutes_sensor[params.list]*60*1000
    logger.verbose(`age:${(age_ms/(60*1000)).toFixed(1)} min ;config:${(cfg_alive_ms/(60*1000)).toFixed(1)}\tstatus:${params.status} ; list:${params.list} ; ${topic}`)
    if((age_ms > cfg_alive_ms)&&(params.status != "alerted")){
      alert(` ⏳ ${topic}> not seen for ${(age_ms/(60*1000)).toFixed(0)} minutes`)
      params.status = "alerted"
    }
  }
}


function watch_topics(data){
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
  if(data.msg.hasOwnProperty("last_seen")){
    let last_seen = new Date(Date.parse(data.msg.last_seen));
    //no stats will be processed in the watch
    topics_map[data.topic].last_seen = last_seen
    if(!last_seen_fresh(last_seen)){
      logger.debug(`last seen not fresh : ${data.topic}`)
      //discard further processing for watch checks as the values is deprecated
      return
    }else{
      logger.verbose(`last_seen update for '${data.topic}'`)
      if(topics_map[data.topic].status == "alerted"){
        topics_map[data.topic].status = "online"
        info(`${data.topic}> back online`)
      }
    }
  }
  for(let [sensor,watch_params] of Object.entries(config.watch[list])){
    if(data.msg.hasOwnProperty(sensor)){
      let value = data.msg[sensor]
      if(watch_params.hasOwnProperty("minimum")){
        if (value < watch_params.minimum){
          if(topics_map[data.topic].status != "alerted"){
            alert(`${data.topic}>🔋 ${sensor} = ${value} is below minimum ${watch_params.minimum}`)
            topics_map[data.topic].status = "alerted"
          }
        }else{
          if(topics_map[data.topic].status == "alerted"){
            info(`${data.topic}> ${sensor} = ${value} back above minimum ${watch_params.minimum}`)
            topics_map[data.topic].status = "healthy"
          }
        }
      }
    }
  }
}

function run_bot_sensors_watch(){
  const token = secrets.bots.sensors_watch_bot.token
  const bot = new Telegraf(token)

  function start(ctx){
    logger.info({from:ctx.from})
    logger.info({chat:ctx.chat})
    if(secrets.users.includes(ctx.from.id)){
          ctx.reply(`Hello! ${ctx.message.from.first_name}`)
          logger.debug({message:ctx.message})
      }else{
          ctx.reply(`I don't know you yet, ${ctx.message.from.first_name}`)
          logger.warn({unauthorised_user:ctx.from})
      }
  }

  bot.start(start)
  
  bot.help((ctx) => ctx.reply('I can only send sensors alerts'))
  bot.hears('hi', (ctx) => ctx.reply('Hey there 👋'))
  mqtt.Emitter.on('mqtt',(data)=>{
    watch_topics(data)
  })

  bot.launch()
  logger.info('sensors_watch started')
  logger.info("check info")
  logger.error("check error")
  logger.verbose("check verbose")
  logger.debug("check debug")
  return bot
}

//------------------ main ------------------
sensor_bot = run_bot_sensors_watch()
init_topics_map()
mqtt.start()

const first_run_delay_ms = 10000
const run_prediod_ms = 10000
setTimeout(()=>{
    setInterval(check_topics_alive,run_prediod_ms)
  },
  first_run_delay_ms
)



