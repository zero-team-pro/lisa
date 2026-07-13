FROM node:20.15.1-bookworm-slim

WORKDIR /app


RUN apt-get update -y && apt-get install -y curl htop
RUN corepack enable


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
COPY .yarnrc.yml .yarnrc.yml
RUN yarn install --immutable


COPY . /app

RUN yarn run build

USER root

# Cache the pinned Yarn release for the runtime user as well as the build user.
RUN yarn --version

CMD ["yarn", "run", "start-gateway"]
