# Backend dependency maintenance

Reviewed on 2026-10-15. This update affects `bot`, its Docker image, and backend
CI jobs. The admin frontend and its dependency lockfile are unchanged.

## Runtime and installation

The backend uses **Node 24.22.1** and **Yarn 4.17.1**. `bot/.nvmrc`, the Docker
base image, and the CI/release quality jobs select the same Node version. The
package engine requires Node 24.22.1 or later within the 24.x line.

Security follow-up on 2026-10-24: Node 24.22.1 includes the October security
fixes, including CVE-2026-111497 in the Brotli decoder. The repository root,
backend, admin build, and isolated migration test client now select this version.
The admin build moves from the unsupported Node 20 line to Node 24; its package
dependencies are unchanged. Rebuild and redeploy the Docker images to apply the
runtime fix; changing the local nvm default does not update existing containers.
See the [Node.js security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).

Validated on Node 24.22.1: immutable Yarn installs for bot and admin, `make check`
(formatting, typecheck, 217 Jest tests and 18 message tests), and the admin
production build. SSH2, Dockerode, and Got imports passed; the existing optional
`cpu-features` build failure still uses SSH2's fallback. Docker image builds and
the isolated database regression were not run because the Docker daemon was
unavailable.

```bash
cd bot
nvm use
corepack enable
corepack yarn install --immutable
cd ..
make check
```

Yarn 4 was already configured; this update retains it and uses only `yarn.lock`.
No environment variables or database migrations are required. Deployment needs
rebuilt backend images; restarting an old image does not update Node or packages.

## Updated direct dependencies

| Package                    | Before   | After    |
| -------------------------- | -------- | -------- |
| `@aws-sdk/client-s3`       | 3.344.0  | 3.1152.0 |
| `amqplib`                  | 0.10.4   | 0.10.9   |
| `axios`                    | 1.4.0    | 1.20.0   |
| `body-parser`              | 1.20.2   | 1.20.8   |
| `compression`              | 1.7.4    | 1.8.2    |
| `cors`                     | 2.8.5    | 2.8.6    |
| `cron`                     | 3.1.7    | 4.4.0    |
| `discord.js`               | 14.15.3  | 14.27.0  |
| `dockerode`                | 4.0.2    | 4.0.12   |
| `dotenv`                   | 16.1.3   | 16.6.1   |
| `express`                  | 4.19.2   | 4.22.3   |
| `extensionless`            | 1.9.9    | 2.0.6    |
| `got`                      | 14.4.1   | 16.1.0   |
| `i18next`                  | 21.9.2   | 21.10.0  |
| `js-tiktoken`              | 1.0.12   | 1.0.21   |
| `lodash`                   | 4.17.21  | 4.18.1   |
| `mastercard-oauth1-signer` | 1.1.6    | 1.2.0    |
| `module-alias`             | 2.2.2    | 2.3.4    |
| `node-fetch`               | 2.6.7    | 2.7.0    |
| `p-map`                    | 6.0.0    | 7.1.1    |
| `pg`                       | 8.11.0   | 8.23.1   |
| `redis`                    | 4.6.14   | 4.7.1    |
| `reflect-metadata`         | 0.1.13   | 0.2.2    |
| `sequelize`                | 6.37.3   | 6.37.8   |
| `sequelize-typescript`     | 2.1.5    | 2.1.6    |
| `typescript`               | 5.4.5    | 5.9.3    |
| `@jest/globals`            | ^30.0.5  | 30.5.2   |
| `@types/amqplib`           | 0.10.5   | 0.10.8   |
| `@types/dockerode`         | 3.3.29   | 4.0.2    |
| `@types/express`           | 4.17.21  | 4.17.25  |
| `@types/mime-types`        | 2.1.1    | 2.1.4    |
| `@types/node`              | 18.19.39 | 24.19.2  |
| `@types/validator`         | 13.7.7   | 13.15.10 |
| `cross-env`                | ^10.0.0  | 10.1.0   |
| `jest`                     | ^30.0.5  | 30.5.2   |
| `ts-jest`                  | ^29.4.1  | 29.4.14  |

Removed unused direct dependencies: `@discordjs/rest`, `@node-redis/client`,
`@node-redis/json`, and `@types/sequelize`. Discord.js provides its REST client;
Lisa imports Redis through `redis`; Sequelize 6 provides its own types.
The `uuid` package and `@types/uuid` were replaced by Node's built-in
`crypto.randomUUID()`, preserving the UUID v4 string format and `uuidShort()`.

## Sequelize cleanup follow-up

Removed the unused `@zeroteam/sequelize-auto-migrations` and `sequelize-cli`
dependencies and the CLI-only `bot/src/configs/sequelize.cjs` configuration.
The generator's obsolete Sequelize 4 dependency is no longer installed.
Updated dottie to 2.0.7, moment to 2.31.0, validator to 13.15.35, and legacy
semver to 5.7.2 within existing ranges. Runtime Sequelize 6.37.8, its TypeScript
wrapper, and the SQL deployment migrations remain in use.
See [the migration review](sequelize-migrations-review.md) and
[the current audit](backend-dependency-audit.md) for evidence and remaining work.

## Compatibility decisions

- **Telegraf remains 4.16.3**, the latest stable version in npm at review time.
  Its Telegram API types remain 7.1.0 as required by Telegraf's own dependency.
  All application imports now use the public `telegraf/types` export, including
  `Convenience`, rather than private `telegraf/typings` paths or an undeclared
  transitive `@telegraf/types` import. Installing types 9.2.1 alone would not add
  support for new Telegram methods to the Telegraf client.
- **Express/body-parser, Redis, amqplib, Dockerode and i18next** retain their
  current major versions. Their compatible updates are included; migrations
  to new major contracts are separate work with live integration checks.
- **Got is updated to 16.1.0**. TypeScript uses `bundler` module resolution to
  read modern package exports while retaining the existing extensionless runtime
  loader. Default imports replace the removed named export; downloaded giveaway
  bytes are normalized to Buffer for Telegram. The obsolete local Got declaration
  is removed, so the compiler now checks the installed package's actual types.
- **Node-fetch remains 2.7.0**, matching Telegraf's supported 2.x dependency.
  Its `Response.buffer()` API is also used for asset downloads.
- **TypeScript remains 5.x**, compatible with ts-jest's supported compiler range.
  The target is ES2022, with ES2023 library declarations. Explicit
  `useDefineForClassFields: false` preserves the existing Sequelize decorator
  field behavior instead of emitting fields that shadow model accessors.
  Node type definitions are aligned to 24.x throughout the dependency tree.
- **Prettier and its SQL plugin remain pinned**. Updating the shared formatter
  would require frontend CSS reformatting and changes to existing SQL migrations.
  `sql-formatter` is also pinned to its previously installed 15.4.7 release.
  This maintenance avoids those unrelated edits.
- **Custom S3 endpoints retain the previous upload format**. New AWS SDK versions
  add automatic CRC32 checksums. For `S3_ENDPOINT`, checksum calculation and
  validation are set to `WHEN_REQUIRED`; ordinary AWS endpoints retain the new
  SDK defaults. Real SDK serialization/signing is checked with an offline HTTP
  handler and fake credentials.

## Verification and development acceptance

Run `make check` and an immutable Yarn installation on Node 24.22.1. Tests cover
Telegram entities and multipart input construction, webhook secret rejection,
linked globalAdmin task access, task retries/outbox, and custom/AWS S3 upload
serialization. OpenAI SDK calls remain mocked; no paid API calls are needed.

Before production, rebuild the development stack and check Telegram polling,
plain/formatted replies, file and photo uploads, linking and `/nexus` access
restrictions. Also check RabbitMQ worker heartbeats, Redis-backed commands,
PostgreSQL reads/writes, cron jobs, and an actual avatar upload to the configured
S3 provider. Unit tests do not replace these external integration checks.

Verified locally: immutable installation, repository formatting, TypeScript,
141 Jest tests and 18 message tests (159 total) on Node 24.16.0. An offline runtime
smoke loaded the updated clients and cron, checked 809 installed package engine
declarations, and registered all application models. Admin role and Telegram
admin-link fields retain their Sequelize accessors without a database connection.

The optional `cpu-features` native optimization did not compile on the local
Node 24 toolchain. Its parent `ssh2` loaded successfully using its fallback;
installation succeeds. Check the VM SSH path on the development server if used.

The gateway Docker image was built on Node 24.16.0 with immutable Yarn 4.17.1
installation. `yarn verify:ci` passed inside the final Linux image with networking
disabled (141 Jest tests plus 18 message tests). An additional offline Linux
smoke loaded Dockerode, SSH2, and Got successfully, including the optional native
optimization fallback. See [the dependency audit](backend-dependency-audit.md) for the
compatible transitive security fixes and unresolved findings. The Sequelize dependency review and package cleanup are complete; the subsequent SQL-only startup change removes gateway synchronization and
verifies fresh/existing databases; see the migration review.

## References

- [Telegraf releases](https://github.com/telegraf/telegraf/releases)
- [Telegraf public type exports](https://telegraf.js.org/modules/Types.html)
- [Node.js release support](https://nodejs.org/en/about/previous-releases)
- [AWS SDK S3 checksum change](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-checksums.html)
- [AWS checksum configuration](https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html)
- [Cron 4 migration](https://github.com/kelektiv/node-cron/blob/main/CHANGELOG.md)
- [Got 15 migration](https://github.com/sindresorhus/got/releases/tag/v15.0.0)
