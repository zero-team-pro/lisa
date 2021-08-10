docker stop genshin-artifact-rater
docker rm genshin-artifact-rater

docker run -d \
  --restart unless-stopped \
  --name genshin-artifact-rater \
  -v /opt/genshin-artifact-rater/prod/:/data/ \
  genshin-artifact-rater
