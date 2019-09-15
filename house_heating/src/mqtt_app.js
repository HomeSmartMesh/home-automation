//http://w3c.github.io/html-reference/input.color.html

var client,textBox;

var mqtt_host = "10.0.0.42";
var mqtt_port = 1884;

var label_r1_target = document.getElementById("label_r1_target");
var label_r1_current = document.getElementById("label_r1_current");
var label_r1_boosting = document.getElementById("label_r1_boosting");
var label_r1_window = document.getElementById("label_r1_window");

var btn_cosy = document.getElementById("btn_cosy");
var btn_active = document.getElementById("btn_active");
var btn_defrost = document.getElementById("btn_defrost");

var sensor_r1 = {};

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  client.subscribe("zig/living heat")
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
  if(message.destinationName == "zig/living heat"){
    let sensor = JSON.parse(message.payloadString);
    label_r1_target.innerHTML = "Target "+sensor["current_heating_setpoint"] + " °"
    label_r1_current.innerHTML = "Current "+sensor["local_temperature"] + " °"
    let system_mode = sensor["eurotronic_system_mode"]
    if(system_mode & 0x10)    {
      label_r1_window.innerHTML = "Window Open"
    }
    else    {
      label_r1_window.innerHTML = ""
    }
    if(system_mode & 0x04)    {
      label_r1_boosting.innerHTML = "Boosting"
    }
    else    {
      label_r1_boosting.innerHTML = ""
    }
    sensor_r1 = sensor;
    console.log("sensor r1 = ",sensor_r1);
  }
}

function sendWavesColors(col1,col2){

  var wave1 = {
    action      : "wave",
    duration_ms : 1000 * 3600 * 3 ,// 3 hours
    length      : 16,
    freq        : 0.2,
    r:col1.r, g:col1.g, b:col1.b
  };

  client.send("esp/curvy/panel",'{"action":"off"}'); 
  setTimeout(() => client.send("esp/curvy/panel",JSON.stringify(wave1)), 500);
}

function setup_buttons(){
  var btn_r1_defrost = document.getElementById("btn_r1_defrost");
  var btn_r1_min2 = document.getElementById("btn_r1_min2");
  var btn_r1_minh = document.getElementById("btn_r1_minh");
  var btn_r1_plus2 = document.getElementById("btn_r1_plus2");
  var btn_r1_plush = document.getElementById("btn_r1_plush");
  var btn_r1_boost = document.getElementById("btn_r1_boost");

  btn_r1_plus2.onclick          = function() {
    var old_heating_setpoint = sensor_r1["current_heating_setpoint"]
    var new_heating_setpoint = old_heating_setpoint+2
    var payload = '{"current_heating_setpoint":'+new_heating_setpoint+'}'
    client.send("zig/living heat/set",payload);
    console.log("plus2 : payload = ",payload)
  }
  btn_r1_min2.onclick          = function() { 
    var old_heating_setpoint = sensor_r1["current_heating_setpoint"]
    var new_heating_setpoint = old_heating_setpoint-2
    var payload = '{"current_heating_setpoint":'+new_heating_setpoint+'}'
    client.send("zig/living heat/set",payload);
    console.log("min2 : palyoad = ",payload);
  }

  
  btn_cosy.onclick = function(){client.send("zig/living heat/set",'{"current_heating_setpoint":'+21+'}')}
  btn_active.onclick = function(){client.send("zig/living heat/set",'{"current_heating_setpoint":'+18+'}')}
  btn_defrost.onclick = function(){client.send("zig/living heat/set",'{"current_heating_setpoint":'+5+'}')}
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
