FROM redis:6.2.6 as redis
FROM rust:1.57.0 AS moduleBuilder

RUN apt clean && apt -y update && apt -y install --no-install-recommends clang && rm -rf /var/lib/apt/lists/*

ARG MODULE_PATH=/usr/lib/redis/modules
RUN mkdir -p ${MODULE_PATH}

COPY --from=redis /usr/local/ /usr/local/

# https://github.com/RediSearch/RediSearch.git
ARG MODULE=RediSearch
ARG VERSION=v2.2.6
WORKDIR /modules
RUN git clone --depth 1 --branch ${VERSION} https://github.com/${MODULE}/${MODULE}.git
WORKDIR /modules/${MODULE}
RUN make setup
RUN make fetch SHOW=1
RUN make build SHOW=1
# RESULT
RUN cp "$(ls -d /modules/${MODULE}/bin/linux-*-release)/search/redisearch.so" ${MODULE_PATH}/redisearch.so

# https://github.com/RedisJSON/RedisJSON.git
ARG MODULE=RedisJSON
ARG VERSION=v2.0.6
WORKDIR /modules
RUN git clone --depth 1 --branch ${VERSION} https://github.com/${MODULE}/${MODULE}.git
WORKDIR /modules/${MODULE}
RUN cargo build --release
# RESULT
RUN cp /modules/${MODULE}/target/release/librejson.so ${MODULE_PATH}/rejson.so

# https://github.com/RedisTimeSeries/RedisTimeSeries.git
ARG MODULE=RedisTimeSeries
ARG VERSION=v1.6.8
WORKDIR /modules
RUN git clone --recursive --branch ${VERSION} https://github.com/${MODULE}/${MODULE}.git
WORKDIR /modules/${MODULE}
#RUN make setup
RUN ./deps/readies/bin/getupdates
RUN ./deps/readies/bin/getpy3
RUN ./system-setup.py
RUN make fetch
RUN make build
# RESULT
RUN cp /modules/${MODULE}/bin/redistimeseries.so ${MODULE_PATH}/redistimeseries.so

RUN ls -al ${MODULE_PATH}


FROM redis:6.2.6

ARG MODULE_PATH=/usr/lib/redis/modules

# Modules copy
COPY --from=moduleBuilder ${MODULE_PATH}/redisearch.so ${MODULE_PATH}/
COPY --from=moduleBuilder ${MODULE_PATH}/rejson.so ${MODULE_PATH}/
COPY --from=moduleBuilder ${MODULE_PATH}/redistimeseries.so ${MODULE_PATH}/

COPY start-redis.sh /app/start-redis.sh
RUN chmod +x /app/start-redis.sh

COPY redis.conf /usr/local/etc/redis/redis.conf

CMD ["/app/start-redis.sh"]
