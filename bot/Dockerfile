FROM node:18.13-buster-slim

WORKDIR /app


RUN apt-get update -y && apt-get install -y curl htop


ARG UID=1000
ARG GID=1000
ENV UID=${UID}
ENV GID=${GID}
RUN usermod -u $UID node
RUN groupmod -g $GID node

RUN chown -hR node:node /app

USER node

COPY package.json package.json
COPY yarn.lock yarn.lock
RUN yarn install --pure-lockfile --network-timeout 300000


COPY . /app

RUN yarn run build

CMD ["yarn", "run", "start-gateway"]
