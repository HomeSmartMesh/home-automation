const Telegraf = require('telegraf')
const Markup = require('telegraf/markup')

function createTelegramPublisher({ logger, secrets, mqtt }) {
  let sensorsWatchBot = null

  function runBotSmartHover() {
    if (
      !secrets ||
      !secrets.bots ||
      !secrets.bots.smart_hover_bot ||
      !secrets.bots.smart_hover_bot.token
    ) {
      logger.warn('smart_hover_bot disabled (missing secrets.bots.smart_hover_bot.token)')
      return null
    }

    function start(ctx) {
      logger.info({ from: ctx.from })
      logger.info({ chat: ctx.chat })
      if (secrets.users.includes(ctx.from.id)) {
        ctx.reply(`Hello! ${ctx.message.from.first_name}`)
        logger.debug({ message: ctx.message })
      } else {
        ctx.reply(`I don't know you yet, ${ctx.message.from.first_name}`)
        logger.warn({ unauthorised_user: ctx.from })
      }
    }

    const token = secrets.bots.smart_hover_bot.token
    const bot = new Telegraf(token)

    bot.start(start)
    bot.command('goto_clean_zone', ({ reply }) => reply('Going to clean zone'))
    bot.command('clean_livingroom', ({ reply }) => reply('Starting the livingroom cleaning'))
    bot.command('clean_kitchen', ({ reply }) => reply('The kitchen is already clean 🍽️'))
    bot.command('clean_bedroom', ({ reply }) => reply('The bedroom is already clean 🛏️'))

    bot.hears('clean', (ctx) =>
      ctx.reply(
        'Which room would you like to clean ❓',
        Markup.keyboard(['/clean_livingroom', '/clean_kitchen', '/clean_bedroom'])
          .oneTime()
          .resize()
          .extra()
      )
    )

    bot.help((ctx) => ctx.reply('How can I help you ❓'))
    bot.hears('hi', (ctx) => ctx.reply('Hey there 👋'))

    if (mqtt && mqtt.Emitter) {
      mqtt.Emitter.on('mqtt', (data) => {
        if (data && data.msg && data.msg.hasOwnProperty('click')) {
          logger.verbose(`bot> ${data.topic} : click = ${data.msg.click}`)
          bot.telegram
            .sendMessage(secrets.bots.smart_hover_bot.chatId, `button clicked ${data.msg.click}`)
            .catch((e) => {
              logger.warn(`telegram send failed: ${e}`)
            })
        }
      })
    }

    bot.launch()
    logger.info('smart_hover_bot started')
    return bot
  }

  function runBotSensorsWatch() {
    if (
      !secrets ||
      !secrets.bots ||
      !secrets.bots.sensors_watch_bot ||
      !secrets.bots.sensors_watch_bot.token
    ) {
      logger.warn(
        'sensors_watch_bot disabled (missing secrets.bots.sensors_watch_bot.token); running in log-only mode'
      )
      return null
    }

    const token = secrets.bots.sensors_watch_bot.token
    const bot = new Telegraf(token)

    function start(ctx) {
      logger.info({ from: ctx.from })
      logger.info({ chat: ctx.chat })
      if (secrets.users.includes(ctx.from.id)) {
        ctx.reply(`Hello! ${ctx.message.from.first_name}`)
        logger.debug({ message: ctx.message })
      } else {
        ctx.reply(`I don't know you yet, ${ctx.message.from.first_name}`)
        logger.warn({ unauthorised_user: ctx.from })
      }
    }

    bot.start(start)

    bot.help((ctx) => ctx.reply('I can only send sensors alerts'))
    bot.hears('hi', (ctx) => ctx.reply('Hey there 👋'))

    bot.launch()
    logger.info('sensors_watch started')
    logger.error('check error')
    logger.info('check info')
    logger.debug('check debug')
    logger.verbose('check verbose')
    return bot
  }

  function start() {
    sensorsWatchBot = runBotSensorsWatch()
    runBotSmartHover()
  }

  function publish(eventType, payload) {
    if (!payload || typeof payload.text !== 'string') return

    if (
      !sensorsWatchBot ||
      !secrets ||
      !secrets.bots ||
      !secrets.bots.sensors_watch_bot ||
      !secrets.bots.sensors_watch_bot.chatId
    ) {
      return
    }

    const prefix = eventType === 'alert' ? '⚠' : eventType === 'info' ? 'ℹ' : null
    const text = prefix ? `${prefix} ${payload.text}` : payload.text
    sensorsWatchBot.telegram.sendMessage(secrets.bots.sensors_watch_bot.chatId, text).catch((e) => {
      logger.warn(`telegram send failed: ${e}`)
    })
  }

  return { start, publish }
}

module.exports = { createTelegramPublisher }
