* get info with
```
udevadm info -a -p  $(udevadm info -q path -n /dev/ttyUSB1)
```
* edit the file
```
sudo nano /etc/udev/rules.d/99-usb-serial.rules
```
* symlink
```
KERNEL=="ttyUSB*", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", MODE="0666", SYMLINK+="usbzigbee"
```

references
* [reactivated.net - guide](http://www.reactivated.net/writing_udev_rules.html)
* [stackexchange - post](https://unix.stackexchange.com/questions/66901/how-to-bind-usb-device-under-a-static-name)
* [UDEV rules for zigbee controller](https://zigbee2mqtt.discourse.group/t/udev-rules-for-zigbee-controller/919)
