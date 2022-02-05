FROM postgres:13.5-alpine

COPY postgresql.conf /usr/local/share/postgresql/postgresql.conf

CMD ["postgres", "-c", "config_file=/usr/local/share/postgresql/postgresql.conf"]
