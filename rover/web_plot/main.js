//http://w3c.github.io/html-reference/input.color.html
//https://www.eclipse.org/paho/clients/js/

var client;

var mqtt_host = "10.0.0.12";
var mqtt_port = 1884;
var first_call = true;
var topicEncoder = "jNodes/75/encoder";
var topicController = "jNodes/106/controller";
var VariableEncoder = "pos";
var VariableController = "alpha";
var topicRov = "jNodes/106/rov";
var topicSync = "jNodes/sync";
var timestamp = 0;
var mqtt_enabled = true;

var inAlpha = document.getElementById("inAlpha");
var labelAlpha = document.getElementById("labelAlpha");
var inNorm = document.getElementById("inNorm");
var labelNorm = document.getElementById("labelNorm");
var isSendOnMove = document.getElementById("isSendOnMove");
var graphDiv = document.getElementById("graphDiv");
var btnStop = document.getElementById("btnStop");
var btnClear = document.getElementById("btnClear");
var btnSync = document.getElementById("btnSync");

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  client.subscribe(topicEncoder);
  client.subscribe(topicController);
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
  if(!mqtt_enabled)
  {
    return;
  }
  //console.log(message.destinationName	+ " : "+message.payloadString);

  let sample = JSON.parse(message.payloadString);
  var trace_id = 0;
  var Variable_id = "Not Initialised";
  if(message.destinationName == topicEncoder)
  {
    trace_id = 0;
    Variable_id = VariableEncoder;
    sample[VariableEncoder] = sample[VariableEncoder] * 255 / 600;
    console.log("topic encoder");
  }
  else
  {
    trace_id = 1;
    Variable_id = VariableController;
    console.log("topic controller");
  }
  if(sample[Variable_id] == undefined)
  {
    return;
  }

  //if(sample["ts"]<=timestamp){//if a new timestamp is smaller than the previous , then reset the plot
  //  first_call = true
  //}

  timestamp = sample["ts"];
  if(first_call)
  {
    first_call = false
    var trEncoder = {
      x: [timestamp], 
      y: [sample[VariableEncoder]],
      mode: 'lines',
      line: {color: '#80CAF6'},
      name : "encoder"
    };
    var trController = {
      x: [timestamp], 
      y: [sample[VariableController]],
      mode: 'lines',
      line: {color: '#CA80F6'},
      name : "controller"
    }
    var data = [trEncoder, trController] ;
    
    //console.log(data)
    //Plotly.plot('graphDiv', data);
    var layout = {
      title: 'nRF MQTT signal',
      dragmode: "pan",
      showlegend: true,
      xaxis:{
        //rangeslider: {range: []}
      },
      yaxis: {
        fixedrange: true
      }
    };
    //layout TODO xaxis.type : date

    var config = {
      scrollZoom:true,
      showLink:true,
      modeBarButtonsToRemove: ['toImage'],
      responsive: true
    }
    Plotly.newPlot(graphDiv, data, layout, config);
  }
  else
  {
    var update = {
      x:  [[sample["ts"]]],
      y: [[sample[Variable_id]]]
      }
      //console.log(update)
      Plotly.extendTraces(graphDiv, update, [trace_id])
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

  btnStop.onclick          = function() 
                          { 
                              if(mqtt_enabled)
                              {
                                mqtt_enabled=false;  
                                btnStop.innerHTML = "Start";
                              }
                              else
                              {
                                mqtt_enabled=true;
                                btnStop.innerHTML = "Stop";
                              }
                            }
  btnStop.onclick          = function() {
                              if(mqtt_enabled)
                              {
                                mqtt_enabled=false;  
                                btnStop.innerHTML = "Start";
                              }
                              else
                              {
                                mqtt_enabled=true;
                                btnStop.innerHTML = "Stop";
                              }
                          }

  btnClear.onclick          = function() { 
    Plotly.deleteTraces(graphDiv, [0,1]);//remove the first trace
    first_call = true;
  }
  btnSync.onclick          = function() { 
    client.send(topicSync,"");
    //console.log("Sync");
  }
                                                      
}

function init(){
  // Create a client instance
  name = "plotter_webapp" + rand();
  client = new Paho.MQTT.Client(mqtt_host, Number(mqtt_port), name);
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
  

