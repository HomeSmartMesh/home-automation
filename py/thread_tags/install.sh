pip3 install -r requirements.txt
rm config.json
mv config-local.json config.json
sudo cp thread_tags.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/thread_tags.service
sudo chmod +x thread_tags.py
sudo systemctl daemon-reload
sudo systemctl enable thread_tags.service
sudo systemctl start thread_tags.service
