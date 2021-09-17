# Intro
controlling smart socket for starting a PC and an ethernet repeater


# Install
    npm install

# related devices
## pc control
* default functionality
## dimmer
* despite the service name `pc_control` the retro light is still plugged in this service
* shelly 1 Power monitor
    * mqtt topic config `retro_light_relay`
* the esp32 firmware is a wifi mqtt to serial adapter https://github.com/ESP32Home/mqtt_serial
    * mqtt topic config `retro_light_dimmer`

`esp/dimmer/response`
```json
{
    "alive":true,
    "list":[1000,2000,3000,4000,5000,6000,7000,8000]
}
```
