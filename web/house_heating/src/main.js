
import * as MyMQTT from './mqtt_app.js';

MyMQTT.init();

MyMQTT.setup_buttons();

var thermo = document.getElementById("thermo");
var pt = thermo.createSVGPoint();

function thermo_move(event){
    var higher = document.getElementById("higher");
    var lower = document.getElementById("lower");
    pt.x = event.clientX;
    pt.y = event.clientY;
    lower.setAttribute("width",pt.x+"px");
    higher.setAttribute("x",pt.x+"px");
    var hwidth = 600 - pt.x;
    higher.setAttribute("width",+hwidth+"px");
    //var val = pt.matrixTransform(thermo.getScreenCTM().inverse());
}

window.onload = function() {

    thermo.onmousemove = function(){thermo_move(event);}
    
  };