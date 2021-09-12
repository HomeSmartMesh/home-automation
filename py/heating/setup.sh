sudo pip3 install -r requirements.txt
sudo cp heat_cut.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/heat_cut.service
sudo chmod +x heat.py
sudo systemctl daemon-reload
sudo systemctl enable heat_cut.service
sudo systemctl start heat_cut.service
