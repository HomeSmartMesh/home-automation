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

sudo cp py/hue/hue.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/hue.service
sudo chmod +x py/hue/hue.py
sudo systemctl daemon-reload
sudo systemctl enable hue.service
sudo systemctl start hue.service

