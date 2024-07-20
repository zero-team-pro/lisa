FROM node:20.15.1-bookworm-slim

WORKDIR /app


RUN apt-get update -y && apt-get install -y curl htop


ARG UID=1000
ARG GID=1000
ARG DOCKER_GID=988

ENV UID="$UID" \
  GID="$GID" \
  DOCKER_GID="$DOCKER_GID"

RUN usermod -u $UID node
RUN groupmod -g $GID node
RUN groupadd -g $DOCKER_GID docker
RUN usermod -aG docker node

RUN chown -hR node:node /app

COPY docker-entrypoint.sh /usr/local/bin/

USER node

COPY package.json package.json
COPY yarn.lock yarn.lock
RUN yarn install --pure-lockfile --network-timeout 300000


COPY . /app

RUN yarn run build

USER root

CMD ["yarn", "run", "start-gateway"]
