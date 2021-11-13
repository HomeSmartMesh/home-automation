* get info with
```
udevadm info -a -p  $(udevadm info -q path -n /dev/ttyUSB1)
```
* edit the file
```
sudo nano /etc/udev/rules.d/10-local.rules
```
* add 
```
ACTION=="add", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", SYMLINK+="/dev/ttyUSB1"
```

references
* [reactivated.net - guide](http://www.reactivated.net/writing_udev_rules.html)
* [stackexchange - post](https://unix.stackexchange.com/questions/66901/how-to-bind-usb-device-under-a-static-name)
