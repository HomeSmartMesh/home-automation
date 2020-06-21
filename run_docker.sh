docker-compose up -d
docker-compose stop

docker exec -it <name> bash
docker exec -it <name> influx

docker run --name webapps -p 80:80 \
-d --restart unless-stopped \
-v /home/pi/raspi/zigbee/graph_view:/usr/share/nginx/html/zigbee:ro \
-v /home/pi/raspi/js/bed_heating:/usr/share/nginx/html/bed:ro \
-v /home/pi/raspi/js/heating:/usr/share/nginx/html/heat:ro \
-v /home/pi/raspi/js/leds_panel:/usr/share/nginx/html/leds:ro \
-v /home/pi/smart_home_3d_webapp:/usr/share/nginx/html/3d:ro \
nginx

docker run --name mos -it -p 1883:1883 -p 1884:1884 -v /home/pi/mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro  eclipse-mosquitto

docker run --name webapps -p 80:80 \
-d --restart unless-stopped \
-v /home/pi/raspi/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
nginx

docker run --name webtest -p 8080:80 \
-d --restart unless-stopped \
-v /home/pi/raspi/js/bed_heating:/usr/share/nginx/html:ro \
nginx

docker run --name webzig -p 9080:80 \
-d --restart unless-stopped \
-v /home/pi/raspi/js/leds_panel:/usr/share/nginx/html:ro \
nginx

docker run --name zigbee -p 80:80 \
-v /home/pi/raspi/zigbee/graph_view:/usr/share/nginx/html/zigbee:ro \
-v /home/pi/raspi/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
nginx
