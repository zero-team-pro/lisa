docker stop lisa-discord-dev
docker rm lisa-discord-dev

docker run -d \
  --restart unless-stopped \
  --name lisa-discord-dev \
  -v /opt/lisa-discord/dev/:/data/ \
  lisa-discord-dev
