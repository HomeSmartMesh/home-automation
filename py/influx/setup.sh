sudo pip3 install -r requirements.txt
sudo mkdir /var/log/influx
sudo cp influx_mqtt.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/influx_mqtt.service
sudo chmod +x influx_client.py
sudo systemctl daemon-reload
sudo systemctl enable influx_mqtt.service
sudo systemctl start influx_mqtt.service
#needs to run inside the container
#influx -execute 'CREATE DATABASE mqtt'
