const fs = require('fs');
const {transports,createLogger, format} = require('winston');

const config = JSON.parse(fs.readFileSync(__dirname+'/config.json'))

const log_filename = fs.existsSync(config.log.share)?config.log.share+config.log.logfile:config.log.logfile
const exc_filename = fs.existsSync(config.log.share)?config.log.share+config.log.exceptions:config.log.exceptions

var logger = createLogger({
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
      new transports.Console({level:'verbose'}),
      new transports.File({ filename: log_filename })
    ],
    exceptionHandlers: [
      new transports.File({ filename: exc_filename ,level:config.log.level})
    ]
  });

logger.info("logger started")

module.exports = {logger:logger};
