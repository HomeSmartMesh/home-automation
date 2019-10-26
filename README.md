# raspi
raspberry pi home server scripts and configuration files of different frameworks

- esp32 : ruler taking as input any mqtt event and as output triggering an esp32 mqtt actions
- hue : any mqtt event result in controlling Hue light
- influx : database client from mqtt to influx, whitelisted elements, with some forcing of data types
- custom mesh client : nRF52832 low power sensors (temp,hum,press,light) and repeater dongles to mqtt
- wemo : sockets electrical power consumption to mqtt logging
- grafana : config and dashboards
- zigbee2mqtt : config and devices

## slider editing web page
- http://danielstern.ca/range.css/#/

## slider css docu
- https://css-tricks.com/styling-cross-browser-compatible-range-inputs-css/

## events
Range input supports standard properties and events
- https://www.w3schools.com/jsref/dom_obj_event.asp
- https://www.w3schools.com/jsref/dom_obj_all.asp
- https://patrickhlauke.github.io/touch/
- on release working : https://codepen.io/mhartington/pen/HKGno

## thermometer svg
- https://upload.wikimedia.org/wikipedia/commons/d/da/Green-Thermometer.svg
