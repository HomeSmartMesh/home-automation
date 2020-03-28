const fs = require('fs');
const Telegraf = require('telegraf')
const {logger} = require('./logger.js')
const mqtt = require('./mqtt.js')
const Markup = require('telegraf/markup')
//const events = require('events')
//const Emitter = new events.EventEmitter()

const secret = JSON.parse(fs.readFileSync(__dirname+'\\secret.json'))
const token = secret.bots.smart_hover_bot.token
const bot = new Telegraf(token)

function start(ctx){
  logger.info({from:ctx.from})
  logger.info({chat:ctx.chat})
  if(secret.users.includes(ctx.from.id)){
        ctx.reply(`Hello! ${ctx.message.from.first_name}`)
        logger.debug({message:ctx.message})
    }else{
        ctx.reply(`I don't know you yet, ${ctx.message.from.first_name}`)
        logger.warn({unauthorised_user:ctx.from})
    }
}

function bot_init(){
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
      bot.telegram.sendMessage(secret.bots.smart_hover_bot.chatId,`button clicked ${data.msg.click}`)
    }
  })
}

//------------------ main ------------------
logger.info('smart_hover_bot started')
mqtt.start()
bot_init()
bot.launch()


