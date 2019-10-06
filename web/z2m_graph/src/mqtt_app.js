//http://w3c.github.io/html-reference/input.color.html

var client,textBox;

var mqtt_host = "10.0.0.42";
var mqtt_port = 1884;

var btn_lifo = document.getElementById("btn_lifo");
var btn_mano = document.getElementById("btn_mano");

var topics = {
  lifo:"lzig/bridge/networkmap",
  mano:"mzig/bridge/networkmap",
  response:"+/bridge/networkmap/graphviz"
}

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  client.subscribe(topics["response"])
  console.log("onConnect");
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
}

// called when a message arrives
function onMessageArrived(message) {
  console.log(message.destinationName	+ " : "+message.payloadString);
  d3.select("#graph").graphviz()
    .renderDot(message.payloadString);
}

function setup_buttons(){
  btn_lifo.onclick = function() { client.send(topics.lifo,"graphviz"); }
  btn_mano.onclick = function() { client.send(topics.mano,"graphviz"); }
}

function init(){
  // Create a client instance
  client = new Paho.MQTT.Client(mqtt_host, Number(mqtt_port), "zigbee_graph_webapp");
  // set callback handlers
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  // connect the client
  client.connect({onSuccess:onConnect});

}

//----------------------------------------------------------------------------------
export{init,setup_buttons}
