#!/bin/bash
sudo rm -rf /var/www/html/heat
sudo cp -r . /var/www/html/heat
sudo rm /var/www/html/heat/deploy.sh
