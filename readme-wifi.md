# Docker compose commands

config file `/etc/wpa_supplicant/wpa_supplicant.conf`

```conf
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=DE

network={
        ssid="My-SSID"
        psk="MyPassword"
}
```
