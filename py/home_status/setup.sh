sudo pip3 install -r requirements.txt
sudo cp home_status.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/home_status.service
sudo chmod +x home.py
sudo systemctl daemon-reload
sudo systemctl enable home_status.service
sudo systemctl start home_status.service
