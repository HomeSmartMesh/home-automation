sudo cp py/nrf_mesh/nrf_mesh.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/nrf_mesh.service
sudo chmod +x py/nrf_mesh/nrf_mesh.py
sudo systemctl daemon-reload
sudo systemctl enable nrf_mesh.service
sudo systemctl start nrf_mesh.service
sudo systemctl status nrf_mesh.service

sudo cp py/hover/hover.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/hover.service
sudo chmod +x py/hover/hover.py
sudo systemctl daemon-reload
sudo systemctl enable hover.service
sudo systemctl start hover.service

sudo cp js/pc_control/pc_power.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/pc_power.service
sudo chmod +x js/pc_control/pc.js
sudo systemctl daemon-reload
sudo systemctl enable pc_power.service
sudo systemctl start pc_power.service

sudo cp js/window_roll/roll.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/roll.service
sudo chmod +x js/window_roll/roll.js
sudo systemctl daemon-reload
sudo systemctl enable roll.service
sudo systemctl start roll.service

sudo cp js/lifx/lifx.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/lifx.service
sudo chmod +x js/lifx/run.js
sudo systemctl daemon-reload
sudo systemctl enable lifx.service
sudo systemctl start lifx.service

sudo cp py/hue/hue.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/hue.service
sudo chmod +x py/hue/hue.py
sudo systemctl daemon-reload
sudo systemctl enable hue.service
sudo systemctl start hue.service

sudo cp py/influx/influx_mqtt.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/influx_mqtt.service
sudo chmod +x py/influx/influx_client.py
sudo systemctl daemon-reload
sudo systemctl enable influx_mqtt.service
sudo systemctl start influx_mqtt.service

sudo cp js/camera_lapse/lapse.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/lapse.service
sudo chmod +x js/camera_lapse/lapse.js
sudo systemctl daemon-reload
sudo systemctl enable lapse.service
sudo systemctl start lapse.service

sudo cp js/watch_bots/watch_bots.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/watch_bots.service
sudo chmod +x js/watch_bots/watch_bots.js
sudo systemctl daemon-reload
sudo systemctl enable watch_bots.service
sudo systemctl start watch_bots.service

sudo cp py/bathroom/bathroom.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/bathroom.service
sudo chmod +x py/bathroom/bathroom.py
sudo systemctl daemon-reload
sudo systemctl enable bathroom.service
sudo systemctl start bathroom.service

sudo cp py/thread_tags/thread_tags.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/thread_tags.service
sudo chmod +x py/thread_tags/thread_tags.py
sudo systemctl daemon-reload
sudo systemctl enable thread_tags.service
sudo systemctl start thread_tags.service



sudo systemctl set-property nrf_mesh.service Framework=raspi_iot
hover
pc_power
roll
lifx
hue
influx_mqtt
lapse
watch_bots
