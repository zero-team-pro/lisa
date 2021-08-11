cat .env.prod > .env
docker build -t lisa-discord --build-arg UID=${UID} --build-arg GID=${UID}  .
