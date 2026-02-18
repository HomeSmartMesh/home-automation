# Overview
Developer hub for Home Automation services, micro-controllers and webapps.
For startups, students and hobbyist who want to understand the basics of home automation and IoT and use it for their own projects and products. Network devices using Thread, Zigbee, wifi are centralized with mqtt then controlled with services based on python and node.js scripts interacting with web apps as user Front End.

# Discussions
get support, give feedback or simply chat to brainstorm about ideas 

https://github.com/HomeSmartMesh/home-automation/discussions

# Documentation

https://homesmartmesh.github.io/frameworks/raspi/

# Safety notice
* Power Sockets have deadly voltage and should not be self altered
* Usage of certified products such as Shelly or others is recommended for any high voltage product
* hacking custom scripts to control equipment might improve safety in case you add power cut off to a lower power for each section and device, but might also alter your food if your fridge inadvertantly goes off due to a wrong configuration
  * reboot state
  * safety power too low
* Any heat power control custom script must necessarily have another safe switch to fully cut the power when away or device is inattended.

# License
MIT

# Install

```shell
curl https://raw.githubusercontent.com/HomeSmartMesh/raspi/master/get_raspi.sh -o get_raspi.sh
sudo sh get_raspi.sh
```

# Shell helpers
Source the helper commands in every shell session by adding the snippet below to `~/.bashrc` (adjust the path if you cloned the repo elsewhere), then start a new shell and run `check`:

```bash
export RASPI_HOME=/home/wass/raspi
source /home/wass/raspi/env.sh
```
