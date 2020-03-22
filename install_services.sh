sudo cp py/nrf_mesh/nrf_mesh.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/nrf_mesh.service
sudo chmod +x py/nrf_mesh/nrf_mesh.py
sudo systemctl daemon-reload
sudo systemctl enable nrf_mesh.service
sudo systemctl start nrf_mesh.service

sudo cp py/hover/hover.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/hover.service
sudo chmod +x py/hover/hover.py
sudo systemctl daemon-reload
sudo systemctl enable hover.service
sudo systemctl start hover.service
