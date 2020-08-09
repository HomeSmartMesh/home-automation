const fs = require('fs');
const {transports,createLogger, format} = require('winston');

const config = JSON.parse(fs.readFileSync(__dirname+'\\config.json'))

let date = new Date().toISOString()
let date_day = date.split('T')[0]
let filename = config.log.logfile.replace("(date)",date_day)

var logger = createLogger({
    format: format.combine(
        format.timestamp(),
        format.printf(log => {
          return `${log.timestamp} |${log.level}\t| ${log.message}`;
        })
    ),
    transports: [
      new transports.Console({
        level:config.log.level,
        json:false
      }),
      new transports.File({
         filename: filename ,
         json:false
        })
    ],
    exceptionHandlers: [
      new transports.File({
        filename: 'log_exceptions.log' ,
        level:config.log.level,
        json:false
      })
    ]
  });

module.exports = {logger:logger};
