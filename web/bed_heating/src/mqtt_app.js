//http://w3c.github.io/html-reference/input.color.html

var client,textBox;

var mqtt_host = "10.0.0.42";
var mqtt_port = 1884;

var btn_on = document.getElementById("btn_on");
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
  badges:{    
    status:document.getElementById("badge_status"),
    relay:document.getElementById("badge_relay"),
  },
  labels:{
    "bed":{
      current:document.getElementById("label_r1_current"),
      level:document.getElementById("label_r1_level"),
      remain:document.getElementById("label_r1_remain"),
      status:document.getElementById("label_relay_status"),
      power:document.getElementById("label_relay_power")
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
    "bed_power":document.getElementById("bed_power")
  },
  progress:{
    "bed_time":document.getElementById("bed_time")
  }
  ,
  topics:{
    "main"  :"esp/bed heater/#",
    "heater"  :"esp/bed heater/1h",
    "heater_status"  :"esp/bed heater/status",
    "level"   :"esp/bed heater/heating",
    "timer"   :"esp/bed heater/timer",
    "weather" :"lzig/bed weather",
    "relay_command"   :"shellies/shelly1pm-C45303/relay/0/command",
    "relay_status"   :"shellies/shelly1pm-C45303/relay/0",
    "relay_power"   :"shellies/shelly1pm-C45303/relay/0/power"
  }
}

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  client.subscribe(house.topics.main)
  client.subscribe(house.topics.weather)
  client.subscribe(house.topics.relay_status)
  client.subscribe(house.topics.relay_power)
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
    show_bed_time(sensor)
  }
  else if (msg_type == "status"){
    //set_badge(house.badges.status,"dark","Offline");
    console.log("mqtt> heater status = ",sensor);
  }
  else if (msg_type == "level"){
    house.ranges.bed_power.value = parseInt(sensor);
    show_bed_level(sensor)
    console.log("mqtt> level = ",sensor);
  }
  else if (msg_type == "relay"){
    if(sensor == "on"){
      set_badge(house.badges.relay,"success","on")
    }else{
      set_badge(house.badges.relay,"dark","off")
    }
    console.log("mqtt> relay status = ",sensor);
  }
  else if (msg_type == "power"){
    house.labels["bed"].power.innerHTML = sensor + " W";
    console.log("mqtt> relay power = ",sensor);
  }
}


// called when a message arrives
function onMessageArrived(message) {
  console.log(message.destinationName	+ " : "+message.payloadString);
  if(message.destinationName == house.topics.weather){   update_bed_with_msg("weather",JSON.parse(message.payloadString));  }
  else if(message.destinationName == house.topics.heater){   update_bed_with_msg("heater",message.payloadString);  }
  else if(message.destinationName == house.topics.heater_status){   update_bed_with_msg("status",message.payloadString);  }
  else if(message.destinationName == house.topics.timer){   update_bed_with_msg("timer",message.payloadString);  }
  else if(message.destinationName == house.topics.level){   update_bed_with_msg("level",message.payloadString);  }
  else if(message.destinationName == house.topics.relay_status){   update_bed_with_msg("relay",message.payloadString);  }
  else if(message.destinationName == house.topics.relay_power){   update_bed_with_msg("power",message.payloadString);  }
}

function set_badge(badge,type,text){
  if(type == "dark"){
    badge.setAttribute("class","badge badge-dark")
  }else if(type == "success"){
    badge.setAttribute("class","badge badge-success")
  }
    badge.innerHTML = text
}

function show_bed_level(new_level){
  house.labels.bed.level.innerHTML = new_level + " /10";
}

function show_bed_time(time_left){
  let time_x10s = parseInt(time_left)
  let time_left_mn = Math.trunc(time_x10s*10/60);
  let time_left_sec = time_x10s*10 - time_left_mn*60;
  house.labels["bed"].remain.innerHTML = time_left_mn+" mn "+time_left_sec+" s";
  let time_percent = Math.trunc(100 * time_x10s / 360);
  house.progress.bed_time.style.width = `${time_percent}%`;
  house.progress.bed_time.setAttribute("aria-valuenow",time_percent);
  console.log(`mqtt> timer = ${time_left} = ${time_left_mn} mn = ${time_percent} %`);
}

function send_bed_level(new_level){
  show_bed_level(new_level);
  client.send(house.topics.heater,new_level);
  console.log("bed set to level "+new_level);
}

function setup_events(){
  house.ranges.bed_power.oninput = function() { show_bed_level(this.value)}
  house.ranges.bed_power.onchange = function() { send_bed_level(this.value)}
}

function send_relay_command(cmd){
  client.send(house.topics.relay_command,cmd);
  console.log("relay "+cmd);
}

function setup_buttons(){

  setup_events();

  btn_on.onclick = function(){ send_relay_command("on"); }
  btn_off.onclick = function(){ 
    send_relay_command("off");
    //set_badge(house.badges.status,"dark","Offline");//TODO last will missing on device side otherwise sticky and always on
    house.labels.bed.level.innerHTML = "?";
    house.labels.bed.remain.innerHTML = "? mn";
    house.progress.bed_time.style.width = "0%";
    house.progress.bed_time.setAttribute("aria-valuenow",0);
    }
  
}

function init(){
  // Create a client instance
  let temp_id = `bed_heating_${Math.round(Math.random()*100)}`;
  console.log(`connecting with id ${temp_id}`);
  client = new Paho.MQTT.Client(mqtt_host, Number(mqtt_port), temp_id);
  // set callback handlers
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  // connect the client
  client.connect({onSuccess:onConnect});

}

//----------------------------------------------------------------------------------
export{init,setup_buttons}
