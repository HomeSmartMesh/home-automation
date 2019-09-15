//http://w3c.github.io/html-reference/input.color.html

var client,textBox;

var mqtt_host = "10.0.0.42";
var mqtt_port = 1884;

var btn_cosy = document.getElementById("btn_cosy");
var btn_active = document.getElementById("btn_active");
var btn_defrost = document.getElementById("btn_defrost");


var house = {
  zigname:{
    "livingroom":"living heat",
    "bedroom":"bedroom heat",
    "kitchen":"kitchen heat",
    "bathroom":"bathroom heat"
  },
  sensors :{
    "livingroom":{}
  },
  labels:{
    "livingroom":{
      target:document.getElementById("label_r1_target"),
      current:document.getElementById("label_r1_current"),
      boosting:document.getElementById("label_r1_boosting"),
      window:document.getElementById("label_r1_window")
    },
    "bedroom":{
      target:document.getElementById("label_r2_target"),
      current:document.getElementById("label_r2_current"),
      boosting:document.getElementById("label_r2_boosting"),
      window:document.getElementById("label_r2_window")
    },
    "kitchen":{
      target:document.getElementById(   "label_r3_target"),
      current:document.getElementById(  "label_r3_current"),
      boosting:document.getElementById( "label_r3_boosting"),
      window:document.getElementById(   "label_r3_window")
    },
    "bathroom":{
      target:document.getElementById(   "label_r4_target"),
      current:document.getElementById(  "label_r4_current"),
      boosting:document.getElementById( "label_r4_boosting"),
      window:document.getElementById(   "label_r4_window")
    }
  },
  buttons:{
    "livingroom":{
      plus2:document.getElementById(  "btn_r1_plus2"),
      plush:document.getElementById(  "btn_r1_plush"),
      min2:document.getElementById(   "btn_r1_min2"),
      minh:document.getElementById(   "btn_r1_minh")
    },
    "bedroom":{
      plus2:document.getElementById("btn_r2_plus2"),
      plush:document.getElementById("btn_r2_plush"),
      min2:document.getElementById("btn_r2_min2"),
      minh:document.getElementById("btn_r2_minh")
    },
    "kitchen":{
      plus2:document.getElementById("btn_r3_plus2"),
      plush:document.getElementById("btn_r3_plush"),
      min2:document.getElementById("btn_r3_min2"),
      minh:document.getElementById("btn_r3_minh")
    },
    "bathroom":{
      plus2:document.getElementById("btn_r4_plus2"),
      plush:document.getElementById("btn_r4_plush"),
      min2:document.getElementById("btn_r4_min2"),
      minh:document.getElementById("btn_r4_minh")
    }
  }
}

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  client.subscribe("zig/living heat")
  client.subscribe("zig/bedroom heat")
  client.subscribe("zig/kitchen heat")
  client.subscribe("zig/bathroom heat")
  console.log("onConnect");
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
}

function update_room(room,sensor){
  house.labels[room].target.innerHTML = "Target "+sensor["current_heating_setpoint"] + " °";
  house.labels[room].current.innerHTML = sensor["local_temperature"] + " °";
  let system_mode = sensor["eurotronic_system_mode"]
  if(system_mode & 0x10)    {
    house.labels[room].window.innerHTML = "Window Open";
  }
  else    {
    house.labels[room].window.innerHTML = "";
  }
  if(system_mode & 0x04)    {
    house.labels[room].boosting.innerHTML = "Boosting";
  }
  else    {
    house.labels[room].boosting.innerHTML = "";
  }
  house.sensors[room] = sensor;
  console.log("update room> sensor in "+room+" = ",sensor);
}


// called when a message arrives
function onMessageArrived(message) {
  console.log(message.destinationName	+ " : "+message.payloadString);
  if(message.destinationName == "zig/living heat"){       update_room("livingroom",JSON.parse(message.payloadString));  }
  else if(message.destinationName == "zig/bedroom heat"){ update_room("bedroom",JSON.parse(message.payloadString));  }
  else if(message.destinationName == "zig/kitchen heat"){ update_room("kitchen",JSON.parse(message.payloadString));  }
  else if(message.destinationName == "zig/bathroom heat"){update_room("bathroom",JSON.parse(message.payloadString));  }
}

function set_room_temp(room,new_temp){
  house.sensors[room]["current_heating_setpoint"] = new_temp;
  house.labels[room].target.innerHTML = "Target "+new_temp + " °";
  var payload = '{"current_heating_setpoint":'+new_temp+'}';
  client.send("zig/"+house.zigname[room]+"/set",payload);
  console.log("room "+room+" set to : payload = "+payload);
}

function set_all_rooms_temp(temp){
  set_room_temp("livingroom",temp);
  set_room_temp("bedroom",temp);
  set_room_temp("kitchen",temp);
  set_room_temp("bathroom",temp);
}

function temp_add(room,temp_add){
  var old_heating_setpoint = house.sensors[room]["current_heating_setpoint"];
  var new_heating_setpoint = old_heating_setpoint+temp_add;
  set_room_temp(room,new_heating_setpoint);
}

function setup_on_click(room_name){
  house.buttons[room_name].plus2.onclick = function() { temp_add(room_name,2); }
  house.buttons[room_name].plush.onclick = function() { temp_add(room_name,0.5); }
  house.buttons[room_name].min2.onclick =  function() { temp_add(room_name,-2); }
  house.buttons[room_name].minh.onclick =  function() { temp_add(room_name,-0.5); }
}

function setup_buttons(){

  setup_on_click("livingroom");
  setup_on_click("bedroom");
  setup_on_click("kitchen");
  setup_on_click("bathroom");
  
  btn_cosy.onclick    = function(){ set_all_rooms_temp(21); }
  btn_active.onclick  = function(){ set_all_rooms_temp(18); }
  btn_defrost.onclick = function(){ set_all_rooms_temp(5); }
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
