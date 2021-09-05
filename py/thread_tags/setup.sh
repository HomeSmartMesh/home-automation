sudo pip3 install -r requirements.txt
sudo mkdir /var/log/thread/
sudo cp thread_tags.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/thread_tags.service
sudo chmod +x thread_tags.py
sudo systemctl daemon-reload
sudo systemctl enable thread_tags.service
sudo systemctl start thread_tags.service
