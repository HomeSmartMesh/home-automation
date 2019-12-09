
import * as MyMQTT from './mqtt_app.js';

MyMQTT.init();

MyMQTT.setup_buttons();

/*var Wemo = require('wemo-client');
var wemo = new Wemo();

wemo.discover(function(err, deviceInfo) {
    console.log('Wemo Device Found: %j', deviceInfo);
  
    // Get the client for the found device
    var client = wemo.client(deviceInfo);
  
    // You definitely want to listen to error events (e.g. device went offline),
    // Node will throw them as an exception if they are left unhandled  
    client.on('error', function(err) {
      console.log('Error: %s', err.code);
    });
  
    // Handle BinaryState events
    client.on('binaryState', function(value) {
      console.log('Binary State changed to: %s', value);
    });
  
    // Turn the switch on
    //client.setBinaryState(1);
  });
  */