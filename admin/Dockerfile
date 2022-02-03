FROM node:16-buster-slim as builder

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


FROM nginx:1.21.6-alpine as nginx

COPY --from=builder /app/build/ /public
COPY  ./nginx.conf /etc/nginx/conf.d/default.conf
