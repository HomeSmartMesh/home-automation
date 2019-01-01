//http://w3c.github.io/html-reference/input.color.html

var client;

var mqtt_host = "10.0.0.12";
var mqtt_port = 1884;
var first_call = true

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  client.subscribe("jNodes/75/text")
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
  //console.log(message.destinationName	+ " : "+message.payloadString);

  let sample = JSON.parse(message.payloadString);
  if(first_call)
  {
    first_call = false
    var data = [{
      x: [sample["ts"]], 
      y: [sample["loop"]],
      mode: 'lines',
      line: {color: '#80CAF6'}
    }] 
    
    
    Plotly.plot('graph', data);  
  }
  else
  {
    var update = {
      x:  [[sample["ts"]]],
      y: [[sample["loop"]]]
      }
      Plotly.extendTraces('graph', update, [0])
  }
}

function setup_buttons(){

}

function init(){
  // Create a client instance
  client = new Paho.MQTT.Client(mqtt_host, Number(mqtt_port), "plotter_webapp");
  // set callback handlers
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  // connect the client
  client.connect({onSuccess:onConnect});

}

//----------------------------------------------------------------------------------

init();

function rand() {
    return Math.random();
  }
  

