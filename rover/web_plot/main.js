//http://w3c.github.io/html-reference/input.color.html

var client;

var mqtt_host = "10.0.0.12";
var mqtt_port = 1884;
var first_call = true;
var topicPlot = "jNodes/75/text";
var topicRov = "jNodes/75/rov";
var timestamp = 0;

var inAlpha = document.getElementById("inAlpha");
var labelAlpha = document.getElementById("labelAlpha");
var inNorm = document.getElementById("inNorm");
var labelNorm = document.getElementById("labelNorm");
var isSendOnMove = document.getElementById("isSendOnMove");
var rfChart = document.getElementById("rfChart");

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  client.subscribe(topicPlot)
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
  if(sample["ts"]<=timestamp){//if a new timestamp is smaller than the previous , then reset the plot
    first_call = true
  }

  timestamp = sample["ts"];
  //sample["A"]
  if(first_call)
  {
    first_call = false
    var data = [{
      x: [timestamp], 
      y: [sample["A"]],
      mode: 'lines',
      line: {color: '#80CAF6'}
    }] 
    
    //console.log(data)
    Plotly.plot('graph', data);  
  }
  else
  {
    var update = {
      x:  [[sample["ts"]]],
      y: [[sample["A"]]]
      }
      //console.log(update)
      Plotly.extendTraces('graph', update, [0])
  }
}

function update_rov(){
  console.log("updating rov")
  var rov_data = {
    alpha: inAlpha.value, 
    norm: ((inNorm.value)/255.0).toFixed(2)
  }
  client.send(topicRov,JSON.stringify(rov_data));

}

function setup_buttons(){

  inAlpha.onclick = function(){
    if(! isSendOnMove.checked){
      update_rov();
    }
  }
  inAlpha.oninput = function (){
    labelAlpha.innerHTML = "Alpha = "+this.value
    if(isSendOnMove.checked){
      update_rov();
    }
  }

  inNorm.onclick = inAlpha.onclick
  inNorm.oninput = function (){
    labelNorm.innerHTML = "Norm = "+this.value
    if(isSendOnMove.checked){
      update_rov();
    }
  }

}

function init(){
  // Create a client instance
  client = new Paho.MQTT.Client(mqtt_host, Number(mqtt_port), "plotter_webapp");
  // set callback handlers
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  // connect the client
  client.connect({onSuccess:onConnect});

  setup_buttons();

}

//----------------------------------------------------------------------------------

init();

function rand() {
    return Math.random();
  }
  

var data = [
    { label: 'Layer 1', values: [ {x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2} ] },
    { label: 'Layer 2', values: [ {x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 4} ] }
  ];

var areaChartInstance = $('#rfChart').epoch({
    type: 'line',
    data: data,
    axes: ['left', 'bottom']
});
