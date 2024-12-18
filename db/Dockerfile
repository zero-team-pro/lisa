FROM postgres:17.2-alpine

COPY postgresql.conf /usr/local/share/postgresql/postgresql.conf

CMD ["postgres", "-c", "config_file=/usr/local/share/postgresql/postgresql.conf"]
