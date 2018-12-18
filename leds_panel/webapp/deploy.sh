#!/bin/bash
sudo rm -rf /var/www/html/panel
sudo cp -r . /var/www/html/panel
sudo rm /var/www/html/panel/deploy.sh
