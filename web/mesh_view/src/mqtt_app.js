
var client;

var mqtt_port = 1884;

//import {MyHome} from './three_app.js';

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  console.log("onConnect");
  client.subscribe("Nodes/#");
  client.subscribe("jNodes/#");
  client.subscribe("cmd/#");
  client.subscribe("remote_cmd/#");
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
}

// called when a message arrives
function onMessageArrived(message) {
  var event = new CustomEvent('mqtt_msg', {detail:{ topic: message.destinationName, payload:message.payloadString }});
  window.dispatchEvent(event);
}

function init(){
  // Create a client instance
  client = new Paho.MQTT.Client("10.0.0.42", Number(mqtt_port), "clientId");
  // set callback handlers
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  // connect the client
  client.connect({onSuccess:onConnect});
}

//----------------------------------------------------------------------------------

//main();

//setup_buttons();

export{init}
