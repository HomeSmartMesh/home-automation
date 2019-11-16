//http://w3c.github.io/html-reference/input.color.html

var client,textBox;

var mqtt_host = "10.0.0.42";
var mqtt_port = 1884;

var btn_off = document.getElementById("btn_off");

var house = {
  zigname:{
    "livingroom":"living heat",
    "bedroom":"bedroom heat",
    "kitchen":"kitchen heat",
    "bathroom":"bathroom heat",
    "office":"office heat"
  },
  sensors :{
    "livingroom":{}
  },
  labels:{
    "bed":{
      current:document.getElementById("label_r1_current"),
      level:document.getElementById("label_r1_level"),
      remain:document.getElementById("label_r1_remain")
    }
  },
  buttons:{
    "bed":{
      plus2:document.getElementById(  "btn_r1_plus2"),
      plush:document.getElementById(  "btn_r1_plush"),
      min2:document.getElementById(   "btn_r1_min2"),
      minh:document.getElementById(   "btn_r1_minh")
    }
  },
  ranges:{
    "bed":document.getElementById("range_r1")
  }
  ,
  topics:{
    "main"  :"esp/bed heater/#",
    "heater"  :"esp/bed heater/1h",
    "level"   :"esp/bed heater/heating",
    "timer"   :"esp/bed heater/timer",
    "weather" :"mzig/bed weather"
  }
}

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  client.subscribe(house.topics["main"])
  client.subscribe(house.topics["weather"])
  console.log("onConnect");
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
}
function update_bed_with_msg(msg_type,sensor){
  if(msg_type == "weather"){
    house.labels["bed"].current.innerHTML = sensor["temperature"] + " °";
    console.log("mqtt> temperature = ",sensor);
  }
  else if (msg_type == "timer"){
    let time_left_mn = Math.trunc(parseInt(sensor)*10/60);
    let time_left_sec = parseInt(sensor)*10 - time_left_mn*60;
    house.labels["bed"].remain.innerHTML = "left "+time_left_mn+" mn "+time_left_sec+" s";
    console.log(`mqtt> timer = ${sensor} = ${time_left_mn} mn`);
  }
  else if (msg_type == "level"){
    house.ranges["bed"].value = parseInt(sensor);
    house.labels["bed"].level.innerHTML = "Level "+sensor;
    console.log("mqtt> level = ",sensor);
  }
}


// called when a message arrives
function onMessageArrived(message) {
  console.log(message.destinationName	+ " : "+message.payloadString);
  if(message.destinationName == house.topics["weather"]){   update_bed_with_msg("weather",JSON.parse(message.payloadString));  }
  else if(message.destinationName == house.topics["heater"]){   update_bed_with_msg("heater",message.payloadString);  }
  else if(message.destinationName == house.topics["timer"]){   update_bed_with_msg("timer",message.payloadString);  }
  else if(message.destinationName == house.topics["level"]){   update_bed_with_msg("level",message.payloadString);  }
}

function send_bed_level(new_level){
  house.labels["bed"].level.innerHTML = "Level "+new_level;
  var payload = new_level;
  client.send(house.topics["heater"],payload);
  console.log("bed set to level "+payload);
}

function show_bed_level(new_level){
  house.labels["bed"].level.innerHTML = "Level "+new_level;
}

function setup_events(){
  house.ranges["bed"].oninput = function() { show_bed_level(this.value)}
  house.ranges["bed"].onchange = function() { send_bed_level(this.value)}
}

function button_set_bed_level(level){
  house.ranges["bed"].value = parseInt(level);
  send_bed_level(level);
  if(level == "0"){
    house.labels["bed"].remain.innerHTML = "left 0 s";
  }
}

function setup_buttons(){

  setup_events();

  btn_off.onclick = function(){ button_set_bed_level("0"); }
  
}

function init(){
  // Create a client instance
  client = new Paho.MQTT.Client(mqtt_host, Number(mqtt_port), "house_heating_webapp");
  // set callback handlers
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  // connect the client
  client.connect({onSuccess:onConnect});

}

//----------------------------------------------------------------------------------
export{init,setup_buttons}
