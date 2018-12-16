
var client,textBox;

var mqtt_host = "10.0.0.42";
var mqtt_port = 1884;

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
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
}

function setup_buttons(){
  var btnOff = document.getElementById("btnOff");
  var btnBlue = document.getElementById("btnBlue");
  var btnGreenWave = document.getElementById("btnGreenWave");
  var btnRedWave = document.getElementById("btnRedWave");

  btnOff.onclick = function()       { client.send("esp/curvy/panel",'{"action":"off"}');  }
  btnBlue.onclick = function()      { client.send("esp/curvy/pixels/all",'{"red":0,"green":0,"blue":3}');  }
  btnGreenWave.onclick = function() { client.send("esp/curvy/panel",'{"action":"wave", "duration_ms":1000,"length":32,"freq":1,"r":0,"g":10,"b":0}');  }
  btnRedWave.onclick = function()   { client.send("esp/curvy/panel",'{"action":"wave", "duration_ms":1000,"length":32,"freq":-1,"r":10,"g":0,"b":0}');  }
}

function init(){
  // Create a client instance
  client = new Paho.MQTT.Client(mqtt_host, Number(mqtt_port), "leds_webapp");
  // set callback handlers
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  // connect the client
  client.connect({onSuccess:onConnect});
}

//----------------------------------------------------------------------------------

//main();

//setup_buttons();

export{init,setup_buttons}
