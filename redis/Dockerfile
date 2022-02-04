# Modules download
FROM redislabs/rejson:2.0.6 as rejson
FROM redislabs/redistimeseries:1.6.8 as redistimeseries

FROM redis:6.2.6 as redis

ENV MODULE_PATH /usr/lib/redis/modules

# Modules copy
COPY --from=rejson ${MODULE_PATH}/redisearch.so ${MODULE_PATH}/
COPY --from=rejson ${MODULE_PATH}/rejson.so ${MODULE_PATH}/
COPY --from=redistimeseries ${MODULE_PATH}/redistimeseries.so ${MODULE_PATH}/

COPY start-redis.sh /app/start-redis.sh
RUN chmod +x /app/start-redis.sh

COPY redis.conf /usr/local/etc/redis/redis.conf

CMD ["/app/start-redis.sh"]
