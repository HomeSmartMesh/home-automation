# raspi
raspberry pi home server scripts and configuration files of different frameworks

- py/esp32 : ruler script taking as input any mqtt event and as output triggering an esp32 mqtt actions
- py/hue : any mqtt event result in controlling Hue light
- py/influx : database client from mqtt to influx, whitelisted elements, with some forcing of data types
- py/nrf_mesh : nRF52832 low power sensors (temp,hum,press,light) and repeater dongles to mqtt
- zigbee/graphview : zigbee2mqtt graphviz web viewer

# nrf mesh

## nRF52 Mesh Dongle required
* see details in hackaday project [nRF5 Custom Mesh Network](https://hackaday.io/project/124114-nrf5-custom-mesh-network/details)

* [nRF 52 Dongle Firmware - github](https://github.com/nRFMesh/nRF52_Mesh)
  
  * [uart dongle firmware - gihub directory](https://github.com/nRFMesh/nRF52_Mesh/tree/master/applications/04_uart_dongle)
  * [usb dongle firmware - gihub directory](https://github.com/nRFMesh/nRF52_Mesh/tree/master/applications/08_usb_dongle)

## running the scripts

[py/nrf_mesh](./py/nrf_mesh/)

    cu -l /dev/ttyACM0 -s 460800 

<img src="./py/nrf_mesh/doc/nrf_serial.gif">

subscribe to topic

    mosquitto_sub -t 'nrf/#' -v | ts

start nrf_mesh

    python3 py/nrf_mesh/nrf_mesh.py

<img src="./py/nrf_mesh/doc/nrf_mqtt.gif">

# zigbee/graphview

[zigbee/graph_view](./zigbee/graph_view/)

<img src="./zigbee/graph_view/../images/demo.gif">

## Features
* configurable ip, port and mqtt base name
* multiple hosts for those using mulitple zigbee2mqtt instances.
* svg pan zoom for simpleefficient viewing. graphs can be so huge that text gets tiny.
* red buttons for change graph layout algorithm. Depending on the network, some algos can be more convenient than others

Note that the following viewer is hosted on github and has therefore a secure connection that shall not swap to a local home connection.

## Inactive hosted page

[link to inactive viewer](./zigbee/graph_view/index.html)

In order to use this script, it is required to host it locally on local raspberry py, see [deploy](zigbee/graph_view/deploy.sh) script for deployment convenience.

Why is this inactive live demo then here ? Because github makes it easy to deploy websites in one click, and it might help to see how the page would show before running your own deployment.


## docu references

- [slider editing web page](http://danielstern.ca/range.css/#/)
- [slider css docu](https://css-tricks.com/styling-cross-browser-compatible-range-inputs-css/)
- https://www.w3schools.com/jsref/dom_obj_event.asp
- https://www.w3schools.com/jsref/dom_obj_all.asp
- https://patrickhlauke.github.io/touch/
- on release working : https://codepen.io/mhartington/pen/HKGno
