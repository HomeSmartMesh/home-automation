docker-compose -f docker-compose-thread.yml up -d --remove-orphans
cd py/influx
./install.sh
cd ../../py/thread_tags
./install.sh
