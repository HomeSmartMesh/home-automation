//http://w3c.github.io/html-reference/input.color.html

var client,textBox;

var mqtt_host = "mqtt_broquer";
var mqtt_port = 1884;
var durationEdit = document.getElementById("inDuration");
var colorPicker = document.getElementById("inColor");
var wavelengthSlider = document.getElementById("inWavelength");
var wavelengthLabel = document.getElementById("wavelengthLabel");

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

function hexCol_to_rgb(hexcol){
  var bigint = parseInt(hexcol.substring(1), 16);
  var r = (bigint >> 16) & 255;
  var g = (bigint >> 8) & 255;
  var b = bigint & 255;
  var rgb = {r:r, g:g, b:b};
  return rgb;
}

function waveParamsToJson(wavetype){

  var duration = durationEdit.value == "" ? 1000 : durationEdit.value*1000;

  var col = hexCol_to_rgb(colorPicker.value);

  var myWave = {
                  action      : wavetype,
                  duration_ms : duration,
                  length      : wavelengthSlider.value,
                  freq        : 1,
                  r:col.r, g:col.g, b:col.b
                };
  return JSON.stringify(myWave)
}


function sendWavesColors(col1,col2){

  var wave1 = {
    action      : "wave",
    duration_ms : 1000 * 3600 * 3 ,// 3 hours
    length      : 16,
    freq        : 0.2,
    r:col1.r, g:col1.g, b:col1.b
  };

  var wave2 = {
    action      : "wave",
    duration_ms : 1000 * 3600 * 3 ,// 3 hours
    length      : 16,
    freq        : -0.3,
    r:col2.r, g:col2.g, b:col2.b
  };

  client.send("esp/curvy/panel",'{"action":"off"}'); 
  setTimeout(() => client.send("esp/curvy/panel",JSON.stringify(wave1)), 500);
  setTimeout(() => client.send("esp/curvy/panel",JSON.stringify(wave2)), 1000);
}

function sendOcean(){

  var col1=hexCol_to_rgb("#000A00");
  var col2=hexCol_to_rgb("#00000A");

  sendWavesColors(col1,col2);
}


function sendSavana(){

  //var col1=hexCol_to_rgb("#FBC600");
  //var col2=hexCol_to_rgb("#AB2C01");
  var col1=hexCol_to_rgb("#826500");
  var col2=hexCol_to_rgb("#4F1400");

  sendWavesColors(col1,col2);
}

function setup_buttons(){
  var btnOff = document.getElementById("btnOff");
  var btnBlue = document.getElementById("btnBlue");
  var btnGreenWave = document.getElementById("btnGreenWave");
  var btnColorWave = document.getElementById("btnColorWave");
  var btnColorWavelet = document.getElementById("btnColorWavelet");
  var btnOcean = document.getElementById("btnOcean");
  var imgOcean = document.getElementById("imgOcean");
  var btnSavana = document.getElementById("btnSavana");
  var imgSavana = document.getElementById("imgSavana");

  btnOff.onclick          = function() { client.send("esp/curvy/panel",'{"action":"off"}');  }
  btnBlue.onclick         = function() { client.send("esp/curvy/pixels/all",'{"red":0,"green":0,"blue":3}');  }
  btnGreenWave.onclick    = function() { client.send("esp/curvy/panel",'{"action":"wave", "duration_ms":1000,"length":32,"freq":1,"r":0,"g":10,"b":0}');  }
  btnRedWave.onclick      = function() { client.send("esp/curvy/panel",'{"action":"wave", "duration_ms":1000,"length":32,"freq":-1,"r":10,"g":0,"b":0}');  }
  btnColorWave.onclick    = function() { client.send("esp/curvy/panel",waveParamsToJson("wave"))  }
  btnColorWavelet.onclick = function() { client.send("esp/curvy/panel",waveParamsToJson("wavelet"))  }
  btnOcean.onclick      = sendOcean;
  imgOcean.onclick      = sendOcean;
  btnSavana.onclick     = sendSavana;
  imgSavana.onclick     = sendSavana;

}

function init(){
  // Create a client instance
  client = new Paho.MQTT.Client(mqtt_host, Number(mqtt_port), "leds_webapp");
  // set callback handlers
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  // connect the client
  client.connect({onSuccess:onConnect});

  wavelengthSlider.oninput = function() {
    wavelengthLabel.innerHTML = "wavelength "+this.value+" px";
  }

  
}

//----------------------------------------------------------------------------------


//main();

//setup_buttons();

export{init,setup_buttons}
