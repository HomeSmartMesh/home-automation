docker run --name webapps -p 80:80 \
-d --restart unless-stopped \
-v /home/pi/raspi/zigbee/graph_view:/usr/share/nginx/html/zigbee:ro \
-v /home/pi/raspi/js/bed_heating:/usr/share/nginx/html/bed:ro \
-v /home/pi/raspi/js/heating:/usr/share/nginx/html/heat:ro \
-v /home/pi/raspi/js/leds_panel:/usr/share/nginx/html/leds:ro \
nginx


docker run --name zigbee -p 80:80 \
-v /home/pi/raspi/zigbee/graph_view:/usr/share/nginx/html/zigbee:ro \
-v /home/pi/raspi/nginx.conf:/etc/nginx/nginx.conf:ro \
nginx
