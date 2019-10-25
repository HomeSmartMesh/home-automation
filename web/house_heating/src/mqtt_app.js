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
    "bathroom":"bathroom heat",
    "office":"office heat"
  },
  sensors :{
    "livingroom":{}
  },
  labels:{
    "livingroom":{
      target:document.getElementById("label_r1_target"),
      current:document.getElementById("label_r1_current"),
      boosting:document.getElementById("label_r1_boosting"),
      window:document.getElementById("label_r1_window"),
      seen:document.getElementById("label_r1_seen")
    },
    "bedroom":{
      target:document.getElementById("label_r2_target"),
      current:document.getElementById("label_r2_current"),
      boosting:document.getElementById("label_r2_boosting"),
      window:document.getElementById("label_r2_window"),
      seen:document.getElementById("label_r2_seen")
    },
    "kitchen":{
      target:document.getElementById(   "label_r3_target"),
      current:document.getElementById(  "label_r3_current"),
      boosting:document.getElementById( "label_r3_boosting"),
      window:document.getElementById(   "label_r3_window"),
      seen:document.getElementById(   "label_r3_seen")
    },
    "bathroom":{
      target:document.getElementById(   "label_r4_target"),
      current:document.getElementById(  "label_r4_current"),
      boosting:document.getElementById( "label_r4_boosting"),
      window:document.getElementById(   "label_r4_window"),
      seen:document.getElementById(   "label_r4_seen")
    },
    "office":{
      target:document.getElementById(   "label_r5_target"),
      current:document.getElementById(  "label_r5_current"),
      boosting:document.getElementById( "label_r5_boosting"),
      window:document.getElementById(   "label_r5_window"),
      seen:document.getElementById(   "label_r5_seen")
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
    },
    "office":{
      plus2:document.getElementById("btn_r5_plus2"),
      plush:document.getElementById("btn_r5_plush"),
      min2:document.getElementById("btn_r5_min2"),
      minh:document.getElementById("btn_r5_minh")
    }
  },
  ranges:{
    "livingroom":document.getElementById("range_r1")
  }
  ,
  topics:{
    "livingroom":"testzig/living heat",
    "bedroom":"lzig/bedroom heat",
    "kitchen":"lzig/kitchen heat",
    "bathroom":"lzig/bathroom heat",
    "office":"lzig/office heat"
  }
}

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  client.subscribe(house.topics["livingroom"])
  client.subscribe(house.topics["bedroom"])
  client.subscribe(house.topics["kitchen"])
  client.subscribe(house.topics["bathroom"])
  client.subscribe(house.topics["office"])
  console.log("onConnect");
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
}
function update_last_seen(room,sensor){
  if("last_seen" in sensor){
    var diff = Date.now() - Date.parse(sensor["last_seen"]);
    if(diff < 0){
      diff = 0;//avoids small clocks discrepancies
    }
    var nb_min = Math.floor(diff / (60*1000));
    if(nb_min < 60){
      house.labels[room].seen.innerHTML = "<span style='color: green;'>"+nb_min+" mn</span>";
    }else if(nb_min > 60){
      var nb_h = Math.floor(nb_min / 60);
      house.labels[room].seen.innerHTML = "<span style='color: red;'>"+nb_h+" h</span>";
    }
  }
  else{
    house.labels[room].seen.innerHTML = "<span style='color: red;'>Not Seen</span>";
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
  update_last_seen(room,sensor);
  console.log("update room> sensor in "+room+" = ",sensor);
}


// called when a message arrives
function onMessageArrived(message) {
  console.log(message.destinationName	+ " : "+message.payloadString);
  if(message.destinationName == house.topics["livingroom"]){       update_room("livingroom",JSON.parse(message.payloadString));  }
  else if(message.destinationName == house.topics["bedroom"]){ update_room("bedroom",JSON.parse(message.payloadString));  }
  else if(message.destinationName == house.topics["kitchen"]){ update_room("kitchen",JSON.parse(message.payloadString));  }
  else if(message.destinationName == house.topics["bathroom"]){update_room("bathroom",JSON.parse(message.payloadString));  }
  else if(message.destinationName == house.topics["office"]){update_room("office",JSON.parse(message.payloadString));  }
}

function set_room_temp(room,new_temp){
  house.sensors[room]["current_heating_setpoint"] = new_temp;
  house.labels[room].target.innerHTML = "Target "+new_temp + " °";
  var payload = '{"current_heating_setpoint":'+new_temp+'}';
  client.send(house.topics[room]+"/set",payload);
  console.log("room "+room+" set to : payload = "+payload);
}

function set_all_rooms_temp(temp){
  set_room_temp("livingroom",temp);
  set_room_temp("bedroom",temp);
  set_room_temp("kitchen",temp);
  set_room_temp("bathroom",temp);
  set_room_temp("office",temp);
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
  setup_on_click("office");
  
  house.ranges.livingroom.oninput = function() {
    house.labels.livingroom.target.innerHTML = "Target "+this.value+" °";
  }

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
