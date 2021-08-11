docker stop lisa-discord-rater-dev
docker rm lisa-discord-rater-dev

docker run -d \
  --restart unless-stopped \
  --name lisa-discord-rater-dev \
  -p 4000:80 \
  -v /opt/lisa-discord/dev/:/data/ \
  lisa-discord-rater-dev
