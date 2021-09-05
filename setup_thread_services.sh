docker-compose -f docker-compose-thread.yml up -d --remove-orphans
pushd py/influx
sudo sh setup.sh
popd
pushd py/thread_tags
sudo sh setup.sh
popd
