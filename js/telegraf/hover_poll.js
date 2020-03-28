const fs = require('fs');
const Telegraf = require('telegraf')
const {logger} = require('./logger.js')

const config = JSON.parse(fs.readFileSync('secret.json'))
const token = config.bots.smart_hover_bot.token

logger.info('smart_hover_bot started')

function start(ctx){
    logger.info({user:ctx.from})
    if(config.users.includes(ctx.from.id)){
        ctx.reply(`Hello! ${ctx.message.from.first_name}`)
        logger.debug({message:ctx.message})
    }else{
        ctx.reply(`I don't know you yet, ${ctx.message.from.first_name}`)
        logger.warn({unauthorised_user:ctx.from})
    }
}

const bot = new Telegraf(token)
bot.start(start)
bot.help((ctx) => ctx.reply('How can I help you ❓'))
bot.hears('hi', (ctx) => ctx.reply('Hey there 👋'))
bot.launch()
