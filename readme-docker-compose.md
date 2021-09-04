# Docker compose commands

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
```
