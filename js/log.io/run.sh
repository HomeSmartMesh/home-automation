sudo cp input/log.io.file.service /etc/systemd/system/log.io.file.service
sudo cp server/log.io.server.service /etc/systemd/system/log.io.server.service 
sudo systemctl enable log.io.server.service
sudo systemctl enable log.io.file.service
sudo systemctl start log.io.server.service
sudo systemctl start log.io.file.service
