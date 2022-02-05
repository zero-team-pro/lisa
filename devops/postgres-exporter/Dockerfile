FROM quay.io/prometheuscommunity/postgres-exporter

USER root
RUN mkdir /data
RUN chown nobody:nobody /data
RUN chmod 777 /data
USER nobody

COPY queries.yaml /data/queries.yaml
ENV PG_EXPORTER_EXTEND_QUERY_PATH=/data/queries.yaml
