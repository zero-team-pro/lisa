# Bot services

## Migrations

When you create or modify models, you need to create and run migrations.

```bash
# Compile TypeScript to JavaScript
yarn build

# Generate migrations
yarn db:makemigrations --name [name]

# Check and edit new migration if necessary

# Start at least gateway service and PostgreSQL to run migrations
docker compose up -d --build
```
