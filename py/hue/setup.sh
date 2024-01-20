sudo cp hue.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/hue.service
sudo chmod +x hue.py
sudo systemctl daemon-reload
sudo systemctl enable hue.service
sudo systemctl start hue.service
#needs to run inside the container
#influx -execute 'CREATE DATABASE mqtt'
