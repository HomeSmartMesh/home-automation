#!/bin/bash
sudo rm -rf /var/www/html/panel
sudo cp -r mesh_wizard /var/www/html/panel
sudo rm /var/www/html/panel/deploy.sh
