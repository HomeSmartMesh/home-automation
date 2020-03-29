const fs = require('fs');
const {transports,createLogger, format} = require('winston');

const config = JSON.parse(fs.readFileSync(__dirname+'/config.json'))

var logger = createLogger({
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
      new transports.Console({level:'verbose'}),
      new transports.File({ filename: config.log.logfile })
    ],
    exceptionHandlers: [
      new transports.File({ filename: 'log_exceptions.log' ,level:config.log.level})
    ]
  });

logger.info("logger started")

module.exports = {logger:logger};
