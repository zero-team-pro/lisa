FROM node:20.15.1-bookworm-slim as builder

WORKDIR /app


RUN apt-get update -y && apt-get install -y curl htop make gcc g++ python3


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

COPY --chown=node:node . /app

ARG VITE_APP_API_HOST
ARG VITE_APP_API_HOST_LE
ENV VITE_APP_API_HOST=${VITE_APP_API_HOST}
ENV VITE_APP_API_HOST_LE=${VITE_APP_API_HOST_LE}
RUN echo "VITE_APP_API_HOST=$VITE_APP_API_HOST" > .env
RUN echo "VITE_APP_API_HOST_LE=$VITE_APP_API_HOST_LE" >> .env

RUN yarn run build


FROM nginx:1.27.1-alpine as nginx

COPY --from=builder /app/dist/ /public
COPY  ./nginx.conf /etc/nginx/conf.d/default.conf
