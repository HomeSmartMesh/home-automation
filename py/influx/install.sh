pip3 install -r requirements.txt
rm config.json
mv config-local.json config.json
sudo cp influx_mqtt.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/influx_mqtt.service
sudo chmod +x influx_client.py
sudo systemctl daemon-reload
sudo systemctl enable influx_mqtt.service
sudo systemctl start influx_mqtt.service
