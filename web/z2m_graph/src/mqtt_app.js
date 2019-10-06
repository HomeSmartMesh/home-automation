//http://w3c.github.io/html-reference/input.color.html

var client,textBox;

var mqtt_host = "10.0.0.42";
var mqtt_port = 1884;

var btn_lifo = document.getElementById("btn_lifo");
var btn_mano = document.getElementById("btn_mano");

var btn_engine_dot = document.getElementById("btn_engine_dot");
var btn_engine_circo = document.getElementById("btn_engine_circo");
var btn_engine_fdp = document.getElementById("btn_engine_fdp");
var btn_engine_neato = document.getElementById("btn_engine_neato");
var btn_engine_osage = document.getElementById("btn_engine_osage");

const engines = ["circo", "dot", "fdp", "neato", "osage", "patchwork", "twopi"];

var graph_text = "";

var topics = {
  lifo:"lzig/bridge/networkmap",
  mano:"mzig/bridge/networkmap",
  response:"+/bridge/networkmap/graphviz"
}

var replacements = [
  { find:"Custom devices (DiY) [CC2530 router](http://ptvo.info/cc2530-based-zigbee-coordinator-and-router-112/) (CC2530.ROUTER)",
    rep:"CC2530.ROUTER"  },
  { find:"Eurotronic Spirit Zigbee wireless heater thermostat (SPZB0001)",
    rep:"Eurotronic Thermostat"  },
  { find:"Xiaomi Aqara wireless switch (with gyroscope) (WXKG12LM)",
    rep:"Aqara gyro WXKG12LM"},
  { find:"Xiaomi Aqara human body movement and illuminance sensor (RTCGQ11LM)",
  rep:"Aqara move RTCGQ11LM"},
  { find:"Xiaomi Aqara temperature, humidity and pressure sensor (WSDCGQ11LM)",
  rep:"Aqara weather WSDCGQ11LM"},
  { find:"Xiaomi Aqara door & window contact sensor (MCCGQ11LM)",
  rep:"Aqara contact MCCGQ11LM"},
  { find:"Xiaomi Aqara single key wireless wall switch (WXKG03LM)",
  rep:"Aqara wall switch WXKG03LM"}
  ]

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

function replace_all(text){
  var res = text
  var rep_pair
  for (rep_pair of replacements){
    res = res.split(rep_pair["find"]).join(rep_pair["rep"]);
    //console.log("find:'",rep_pair.find,"'replace with'",rep_pair.rep,"'");
  }

  return res;
}

function render(algo){
  d3.select("#graph")
    .graphviz()
    .engine(algo)
    .renderDot(graph_text);
}

// called when a message arrives
function onMessageArrived(message) {
  //console.log(message.destinationName	+ " : "+message.payloadString);
  graph_text = replace_all(message.payloadString);
  if(message.destinationName.split('/')[0] == "lzig"){
    render("fdp");
  }
  else if(message.destinationName.split('/')[0] == "mzig"){
    render("circo");
  }
  else{
    render("dot");
  }
}

function setup_buttons(){
  btn_lifo.onclick = function() { client.send(topics.lifo,"graphviz"); }
  btn_mano.onclick = function() { client.send(topics.mano,"graphviz"); }

  btn_engine_dot.onclick    = function(){render("dot");}
  btn_engine_circo.onclick  = function(){render("circo");}
  btn_engine_fdp.onclick    = function(){render("fdp");}
  btn_engine_neato.onclick  = function(){render("neato");}
  btn_engine_osage.onclick  = function(){render("osage");}
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
