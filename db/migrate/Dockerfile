FROM migrate/migrate:v4.18.1

VOLUME ["/db/migrations"]

# migrate -database ${POSTGRES_URL} -path /db/migrations up
COPY migrate.sh /app/migrate.sh

ENTRYPOINT "/app/migrate.sh"
CMD ""
