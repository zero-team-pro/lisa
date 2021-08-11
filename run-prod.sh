docker stop lisa-discord-rater
docker rm lisa-discord-rater

docker run -d \
  --restart unless-stopped \
  --name lisa-discord-rater \
  -v /opt/lisa-discord/prod/:/data/ \
  lisa-discord-rater
