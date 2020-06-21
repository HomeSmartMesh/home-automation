* create venv
* attach dongle
* provie access to serial

# Crash case
* no mqtt nrf
    sub 'nrf/#' -v | ts

* serial port connect shows messages
    cu -l /dev/ttyACM0 -s 460800

* service state active
    sudo systemctl status nrf_mesh.service

* log stops with last sensors notifications

# Recover
* service restart
```    
sudo systemctl restart nrf_mesh.service
```

* cu listner got disconnected
```
pid:10;ctrl:0x81;src:92;temp:21.22;hum:54.053;press:964.37
pid:10;ctrl:0x81;src:76;temp:22.18;hum:47.824;press:965.53
cmd:set_channel;set:2;get:2
cu: Got hangup signal

Disconnected.
```
* mqtt publishing recovered
