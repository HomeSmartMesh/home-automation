function createFanout({ logger, config, secrets, mqtt }) {
  const publishers = []

  const fanoutConfig = (config && (config.fanout || config.publishers)) || {}
  const isEnabled = (name) => {
    if (!fanoutConfig || typeof fanoutConfig !== 'object') return true
    if (!Object.prototype.hasOwnProperty.call(fanoutConfig, name)) return true
    return fanoutConfig[name] === true
  }

  if (isEnabled('telegram')) {
    try {
      const { createTelegramPublisher } = require('./publishers/telegram.js')
      publishers.push(createTelegramPublisher({ logger, config, secrets, mqtt }))
    } catch (e) {
      logger.warn(`failed to load telegram publisher: ${e}`)
    }
  } else {
    logger.info('telegram publisher disabled by config')
  }

  function start() {
    for (const publisher of publishers) {
      try {
        if (publisher && typeof publisher.start === 'function') publisher.start()
      } catch (e) {
        logger.warn(`publisher start failed: ${e}`)
      }
    }
  }

  function publish(eventType, payload) {
    for (const publisher of publishers) {
      try {
        if (publisher && typeof publisher.publish === 'function') {
          publisher.publish(eventType, payload)
        }
      } catch (e) {
        logger.warn(`publisher publish failed (${eventType}): ${e}`)
      }
    }
  }

  return { start, publish }
}

module.exports = { createFanout }
