const fs = require('fs');
const {logger} = require('./logger.js')
const mqtt = require('./mqtt.js')
const http = require('http');
const { stringify } = require('querystring');
const config = JSON.parse(fs.readFileSync(__dirname+'/config.json'))

const file_base = fs.existsSync(config.camera.record_path)?config.camera.record_path:"images/"

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//------------------ main ------------------
logger.info('window blind roll service just started')
logger.info('test info')
logger.verbose('test verbose')
logger.debug('test debug')
logger.silly('test silly')
mqtt.start()

mqtt.Emitter.on('mqtt',(data)=>{
  if(data.topic == "camera/jpg"){
      let date = new Date().toISOString()
      let date_day = date.replace('T',' ').replace('Z','').replace(':','.').replace(':','.')
      fs.writeFile(`${file_base}${date_day}.jpg`,data.msg, (err)=>{if(err) throw err;})
      logger.verbose(`saved jpg image ${date_day}.jpg`)
  }
})

