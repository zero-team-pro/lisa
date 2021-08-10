cat .env.prod > .env
docker build -t genshin-artifact-rater --build-arg UID=${UID} --build-arg GID=${UID}  .
