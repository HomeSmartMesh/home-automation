# Docker compose commands

cleaning docker, removes even running containers
```bash
docker rm -vf $(docker ps -aq)
docker rmi -f $(docker images -aq)
docker volume prune -f
```

```bash
dc -f current.yml up -d
dc -f current.yml up -d --remove-orphans

dc stop webapps
dc rm
dc up -d webapps

dc logs webapps
dc up -d --build webapps

dc ps
dc images

docker rmi nginx
docker ps
docker attach 8f5000b5df47
docker exec -it d07161590a12 bash

docker ps -f "status=exited"
docker logs --tail=50 <container id>

sudo docker update --restart=no 5b7637252532
docker stop 5b7637252532
```
