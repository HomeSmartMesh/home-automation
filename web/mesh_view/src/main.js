
import * as three from './three_app.js';
import * as mqtt from './mqtt_app.js';
import * as hue from './hue_app.js';

three.init();
mqtt.init();
hue.init();

//hue.create_user();