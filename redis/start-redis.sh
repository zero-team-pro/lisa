#!/usr/bin/env bash

# Place password from environment variable to config if not exists
if grep -Fq "requirepass " /usr/local/etc/redis/redis.conf
then
  echo "Password already places"
else
  echo "Password injected"
  echo "requirepass \"$REDIS_PASSWORD\"" >> /usr/local/etc/redis/redis.conf
fi

# Start redis
redis-server /usr/local/etc/redis/redis.conf
