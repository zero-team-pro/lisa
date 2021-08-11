docker stop lisa-discord
docker rm lisa-discord

docker run -d \
  --restart unless-stopped \
  --name lisa-discord \
  -v /opt/lisa-discord/prod/:/data/ \
  lisa-discord
