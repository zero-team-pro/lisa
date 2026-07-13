# Admin panel - <https://lisa.zero-team.pro>

Project navigation and the link to the Nexus planning hub are documented in
[`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md).

## [Discord Server](https://discord.gg/2rvxaQWj)

## Architecture

![architecture.png](https://raw.githubusercontent.com/zero-team-pro/lisa/master/bot/public/github/lisa-architecture.png)

## About

I don't know what the Lisa is. Let's call it CMS for messengers with incomplete and additional functionality.

## GI Rater Usage

```bash
-rate <image/url> [lvl=<level>] [<stat>=<weight> ...]
```

### Default Weights

ATK%, DMG%, Crit - 1 \
ATK, EM, Recharge - 0.5 \
Everything else - 0

### Options

#### Level

Compare to specified artifact level (defaults to parsed artifact level)

```bash
-rate lvl=20
```

#### Weights

Set custom weights (valued between 0 and 1)

```bash
-rate atk=1 er=0 atk%=0.5
```

\<stat> is any of HP, HP%, ATK, ATK%, ER (Recharge), EM, PHYS, CR (Crit Rate), CD (Crit Damage), ELEM (Elemental DMG%), Heal, DEF, DEF%

## Development

If you need help or want to contribute, feel free to join [Discord Server](https://discord.gg/2rvxaQWj).

### Setup

```bash
cp .env.example .env
# Edit .env file and fill required data (some are described below)
docker compose up --build
make setup
```

`make setup` enables the repository-managed pre-commit hook. Before each
commit, staged files are formatted with the same Prettier configuration used
by VS Code. Tests and typechecks are not run automatically by Git hooks.

### Local checks

```bash
make format       # rewrite files with Prettier
make test         # fast unit tests
make check        # formatting + typecheck + unit tests
make ci           # full bot CI check with coverage
make docker-build # slow gateway image build used by release
```

Use `make test` during development, `make check` when you want a local quality gate, and
`make ci docker-build` when changing dependencies, Docker configuration, or
release-sensitive code. GitHub Actions runs the fast quality gate and Docker
build for branches and pull requests; release publishes images only after the
full check succeeds.

### .env variables

#### COMPOSE_PROFILES

Leave only what you need.

**admin** - Admin panel (React app) \
**rater** - Genshin Impact artifact rater \
**monitor** - PostgreSQL diagnostics exporter \
**telegram** - Telegram bot

#### DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET

Create application and bot for it on [Discord Developer Portal](https://discord.com/developers/applications).

#### MAIN_CHANNEL_ID

Discord channel id for system messages. Your bot should have privileges to send messages to this channel.

#### NOTIFY_TOKENS

Optional comma-separated `token:chatId` pairs for the public machine-to-machine
`POST /notify` endpoint. When unset, the endpoint rejects every request with
`401`. Messages are delivered as plain text through the Telegram service.

```bash
curl -X POST "https://${API_HOST}/notify" \
  -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{"text":"Notification text","source":"nexus-automation"}'
```

#### OCR_SPACE_API_KEY

Optional. Set up a bot on the Discord Developer Portal \
Go to <https://ocr.space> and get an API key.

#### RATER_HOST

Leave default value for development.

#### \*\_HOST and \*\_HOST_LE

[nginx-proxy](https://hub.docker.com/r/jwilder/nginx-proxy) and [acme-companion](https://hub.docker.com/r/nginxproxy/acme-companion) host addresses. The last one is optional.
