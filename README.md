# Admin panel - https://lisa.zero-team.pro
# Discord Support - https://discord.gg/2rvxaQWj

## Architecture
![architecture.png](https://raw.githubusercontent.com/SemperPeritus/lisa-discord-bot/master/bot/public/github/lisa-architecture.png)

## GI Rater Usage

```
-rate <image/url> [lvl=<level>] [<stat>=<weight> ...]
```

#### Default Weights

ATK%, DMG%, Crit - 1 \
ATK, EM, Recharge - 0.5 \
Everything else - 0

### Options
#### Level
Compare to specified artifact level (defaults to parsed artifact level)
```
-rate lvl=20
```

#### Weights
Set custom weights (valued between 0 and 1)
```
-rate atk=1 er=0 atk%=0.5
```
\<stat> is any of HP, HP%, ATK, ATK%, ER (Recharge), EM, PHYS, CR (Crit Rate), CD (Crit Damage), ELEM (Elemental DMG%), Heal, DEF, DEF%

## Development
If you need help or want to contribute, feel free to join https://discord.gg/2rvxaQWj

### Setup
```
nano .env && build.sh && docker-compose up -d
```

Set up a bot on the Discord Developer Portal \
Go to https://ocr.space and get an API key

Store environment variables for OCR Space and Discord in `.env`
```
DISCORD_TOKEN=<token>
OCR_SPACE_API_KEY=<key>
```
