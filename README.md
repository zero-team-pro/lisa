# Admin panel - <https://lisa.zero-team.pro>

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
```

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

#### OCR_SPACE_API_KEY

Optional. Set up a bot on the Discord Developer Portal \
Go to <https://ocr.space> and get an API key.

#### RATER_HOST

Leave default value for development.

#### \*\_HOST and \*\_HOST_LE

[nginx-proxy](https://hub.docker.com/r/jwilder/nginx-proxy) and [acme-companion](https://hub.docker.com/r/nginxproxy/acme-companion) host addresses. The last one is optional.
