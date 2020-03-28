const {transports,createLogger, format} = require('winston');

var logger = createLogger({
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
      new transports.Console({level:'debug'}),
      new transports.File({ filename: 'log_hover.log' })
    ],
    exceptionHandlers: [
      new transports.File({ filename: 'log_exceptions.log' })
    ]
  });

logger.info("logger started")

module.exports = {logger:logger};
