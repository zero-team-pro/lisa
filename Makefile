.PHONY: setup format test check ci docker-build

# Run once after cloning: installs the repository-managed Git hooks.
setup:
	cd bot && corepack yarn install --frozen-lockfile
	./scripts/setup-git-hooks.sh

# Rewrite supported files with the same Prettier config used by VS Code.
format:
	bot/node_modules/.bin/prettier --plugin ./bot/node_modules/prettier-plugin-sql/lib/index.js --write . --ignore-path .prettierignore

# Fast unit suite; intended for normal development and pre-commit use.
test:
	cd bot && corepack yarn test:unit

# Fast quality gate: formatting, TypeScript, and unit tests.
check:
	bot/node_modules/.bin/prettier --plugin ./bot/node_modules/prettier-plugin-sql/lib/index.js --check . --ignore-path .prettierignore
	cd bot && corepack yarn typecheck
	cd bot && corepack yarn test:unit

# Full CI-equivalent bot check, including coverage.
ci:
	bot/node_modules/.bin/prettier --plugin ./bot/node_modules/prettier-plugin-sql/lib/index.js --check . --ignore-path .prettierignore
	cd bot && corepack yarn typecheck
	cd bot && corepack yarn test:ci

# Slow release-equivalent gateway image build.
docker-build:
	docker compose build gateway
