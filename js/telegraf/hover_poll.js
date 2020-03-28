const fs = require('fs');
const Telegraf = require('telegraf')
const {logger} = require('./logger.js')
const Markup = require('telegraf/markup')

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
bot.launch()
