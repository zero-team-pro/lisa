#!/bin/sh

echo "List of migations:"
ls -l /db/migrations

echo -e "\n========================================\n"

exec migrate -database "${POSTGRES_URL}" -path /db/migrations up
