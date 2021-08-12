FROM node:16-buster-slim

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
RUN yarn install --pure-lockfile


COPY . /app


CMD ["yarn", "run", "start"]
