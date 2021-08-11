cat .env.prod > .env
docker build -t lisa-discord-rater --build-arg UID=${UID} --build-arg GID=${UID} rater
