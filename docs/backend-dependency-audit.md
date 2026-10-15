# Backend dependency audit

Audit date: 2026-10-15. Run with Yarn 4.17.1 on Node 24.16.0 after backend
updates and the approved Sequelize dependency cleanup. The user authorized
sending package names and versions to the npm advisory service. The admin
frontend is outside this audit.

## Current results

- **No critical or high findings** in either production or the full dependency tree.
- Production: **5 moderate entries** — **1 vulnerability advisory** (UUID) and
  **4 deprecation notices** (dottie, glob, inflight, prom-client).
- Full tree including devDependencies: **6 moderate entries** — **2 vulnerability
  advisories** (UUID, sprintf-js) and the same **4 deprecation notices**.
- Audit still exits with status 1. The remaining advisories have not been suppressed.

## Changes and audit history

The initial backend audit had 39 production entries, including one critical.
Compatible updates to Babel runtime/tooling, brace-expansion, minimatch,
proxy-addr, diff, tar, underscore, undici, browserslist, cross-spawn, js-yaml,
picomatch and shell-quote reduced this to 8 production entries. The full tree
still had 19 entries, including four critical reports under the obsolete
migration generator's Sequelize 4.44.4.

The subsequent approved cleanup:

- Removed `@zeroteam/sequelize-auto-migrations`, `sequelize-cli`, and the unused
  CLI-only `bot/src/configs/sequelize.cjs` configuration.
- Removed Sequelize 4 and its old dependency chain from the backend lockfile.
- Updated runtime dottie **2.0.6 → 2.0.7**, moment **2.29.4 → 2.31.0**, and
  validator **13.12.0 → 13.15.35** within existing Sequelize dependency ranges.
- Updated semver **5.7.1 → 5.7.2**, closing the remaining high finding in
  cross-spawn's development tooling chain.
- Kept runtime Sequelize **6.37.8**, sequelize-typescript **2.1.6**, the SQL
  migration files, and the separate golang-migrate deployment service.

Production entries are now **39 → 8 → 5**. The full tree is **19 → 6** since the
previous recorded audit. Counts include deprecation notices and must not be
read as counts of confirmed exploitable vulnerabilities in Lisa.

## Remaining production findings

| Package       | Versions      | Severity | Advisory / notice                                             |
| ------------- | ------------- | -------- | ------------------------------------------------------------- |
| `dottie`      | 2.0.7         | moderate | Deprecation notice                                            |
| `glob`        | 7.2.0         | moderate | Deprecation notice                                            |
| `inflight`    | 1.0.6         | moderate | Deprecation notice                                            |
| `prom-client` | 15.1.3        | moderate | Deprecation notice                                            |
| `uuid`        | 8.3.2, 10.0.0 | moderate | [advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |

## Remaining full tree

| Package       | Versions      | Severity | Advisory / notice                                             |
| ------------- | ------------- | -------- | ------------------------------------------------------------- |
| `dottie`      | 2.0.7         | moderate | Deprecation notice                                            |
| `glob`        | 10.5.0        | moderate | Deprecation notice                                            |
| `inflight`    | 1.0.6         | moderate | Deprecation notice                                            |
| `prom-client` | 15.1.3        | moderate | Deprecation notice                                            |
| `sprintf-js`  | 1.0.3         | moderate | [advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) |
| `uuid`        | 8.3.2, 10.0.0 | moderate | [advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |

## Verification

After cleanup, `yarn install --immutable` and repository `make check` passed on
Node 24.16.0. The final gateway Docker image built successfully, and its
`yarn verify:ci` passed without networking: **141 Jest tests plus 18 message tests**.
An offline dependency/config check confirmed that the retired packages are no
longer resolvable, the CLI-only config is removed, and runtime Sequelize resolves
the three intended patched dependencies. Production data and migration files
were not changed. No paid provider requests were made.

## Remaining scope

The [Sequelize and migration review](sequelize-migrations-review.md) explains
why the obsolete generator was no longer used and why the runtime ORM remains
on v6. The agreed package cleanup is implemented.

- UUID is still brought by Sequelize and Dockerode. Fixed releases require a
  major change outside the declared dependency ranges; no forced override was
  applied. The inspected Sequelize call sites use v1/v4, while the advisory
  covers v3/v5/v6 with output buffers. This is not a complete exploitability
  assessment of every dependency call site.
- sprintf-js remains under the development coverage/config-loading chain via
  argparse. The compatible declared range does not provide an advisory-free
  version. A tooling migration or a separately verified override is future work.
- Patched dottie 2.0.7 is now deprecated, but its previously reported prototype
  pollution advisory is fixed. Deprecation notices are distinct from advisories.
- Gateway `sequelize.sync()` was removed in the subsequent SQL-only startup fix;
  isolated fresh/existing database integration checks pass. No production schema
  was changed by these reviews.

Reproduce from `bot`:

```bash
corepack yarn npm audit --all --recursive --environment production
corepack yarn npm audit --all --recursive
```
