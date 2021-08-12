cat .env.dev > .env
cat .env > bot/.env
cat .env > rater/.env
docker build -t lisa-discord-rater-dev rater
