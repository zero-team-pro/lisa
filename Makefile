.PHONY: setup format test check ci docker-build dev-up dev-down dev-logs

# Run once after cloning: installs the repository-managed Git hooks.
setup:
	cd bot && corepack yarn install --immutable
	cd admin && corepack yarn install --immutable
	./scripts/setup-git-hooks.sh

# Rewrite supported files with the same Prettier config used by VS Code.
format:
	cd bot && corepack yarn prettier --plugin ./node_modules/prettier-plugin-sql/lib/index.js --write .. --ignore-path ../.prettierignore

# Fast unit suite; intended for normal development and pre-commit use.
test:
	cd bot && corepack yarn test:unit

# Fast quality gate: formatting, TypeScript, and unit tests.
check:
	cd bot && corepack yarn prettier --plugin ./node_modules/prettier-plugin-sql/lib/index.js --check .. --ignore-path ../.prettierignore
	cd bot && corepack yarn typecheck
	cd bot && corepack yarn test:unit

# Full CI-equivalent bot check, including coverage.
ci:
	cd bot && corepack yarn prettier --plugin ./node_modules/prettier-plugin-sql/lib/index.js --check .. --ignore-path ../.prettierignore
	cd bot && corepack yarn typecheck
	cd bot && corepack yarn test:ci

# Slow release-equivalent gateway image build.
docker-build:
	docker compose build gateway

# Local stack with its own RabbitMQ 3.13.4 and mutual TLS.
dev-up:
	./scripts/setup-local-rabbitmq.sh
	docker compose --env-file .env --env-file .local/rabbitmq/compose.env -f docker-compose.yml -f docker-compose.local.yml up -d --build

dev-down:
	docker compose --env-file .env --env-file .local/rabbitmq/compose.env -f docker-compose.yml -f docker-compose.local.yml down

dev-logs:
	docker compose --env-file .env --env-file .local/rabbitmq/compose.env -f docker-compose.yml -f docker-compose.local.yml logs -f gateway rabbitmq bot-shard-0 telegram
