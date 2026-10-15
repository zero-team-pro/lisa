# Sequelize and migration review

Reviewed and cleaned up on 2026-10-15. This document records the investigation
and the approved package cleanup. No production database was accessed or schema
changed. Gateway synchronization removal and fresh/existing database checks are now
implemented; details are recorded below.

## Findings

At the start of this review, Lisa had three distinct mechanisms:

1. Runtime ORM: Sequelize 6.37.8 with sequelize-typescript 2.1.6 and pg 8.23.1.
2. Deployment migrations: numbered SQL files in `bot/src/migrations`, applied
   by the `migrate` Compose service using `migrate/migrate:v4.18.1`.
3. Obsolete development generator: `@zeroteam/sequelize-auto-migrations@1.1.0`,
   which installs its own Sequelize 4.44.4. It is still installed in the backend
   image because the Dockerfile installs development dependencies too.

`sequelize-cli@6.6.5` was also installed but had no remaining repository script,
workflow, or deployment reference. Its CLI config `bot/src/configs/sequelize.cjs`
is separate from the runtime config `sequelize.js`.

## Migration history

| Commit    | Date       | Evidence                                                                                                                     |
| --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `4d50512` | 2023-04-09 | Adds upstream automatic generator and `db:makemigrations`; initial JS migration contains generated action/revision metadata. |
| `f912a56` | 2023-05-20 | Changes the generation command to `.mjs` and an ESM loader.                                                                  |
| `c4702e6` | 2023-06-02 | Replaces the Scimonster Git dependency with the published `@zeroteam` package.                                               |
| `7f50a66` | 2024-07-20 | Deletes the tracked `_current.json` model snapshot used by the generator.                                                    |
| `0c2f838` | 2024-12-20 | Replaces JS migrations with SQL up/down files and introduces the standalone migrate service.                                 |
| `8fdf6b6` | 2025-08-09 | Removes `migrate`, `migrate-undo`, `mig-gen`, and `db:makemigrations` scripts; package dependencies remain.                  |
| `8080353` | 2026-10-15 | Adds `5_nexus_tasks.up.sql` / `.down.sql`, with explicit checks, partial/expression indexes, and SQL migration tests.        |

The latest migration is SQL, executed by golang-migrate. The fork emits JS files
through Sequelize QueryInterface; it is absent from the current migration
execution and generation pipeline. Repository evidence does not show it being
used to generate the Nexus SQL migration. Git cannot establish whether somebody
ran an unrelated local tool outside the tracked workflow.

The `SequelizeMeta` table in `1_init.up.sql` is a historical artifact and is not
evidence that Sequelize CLI still applies migrations. Do not drop it as part of
a package cleanup; that would require a separate database decision.

## Why the fork existed

This is a published organizational npm package backed by
[zero-team-pro/sequelize-auto-migrations](https://github.com/zero-team-pro/sequelize-auto-migrations),
not a local patched copy of Sequelize. Its parent is Scimonster's fork; the
original project is flexxnn's sequelize-auto-migrations.

Comparing upstream `a063aa65` with the fork's `master` shows two commits in May
2023: `6f4bfeaa` and `af749e48`. Relevant changes:

- Changes `makemigration.js` to `makemigration.mjs` and loads application models
  with dynamic `import()` instead of `require()`.
- Adds guards for missing index diff values, preventing exceptions while adding
  or removing indexes. These guards skip the affected action; they are not a
  complete validation of index generation correctness.
- Changes package name/repository metadata for publication under `@zeroteam`.
- Retains `sequelize: ^4.42.0`; this was not an upgrade of the generator to v6.

The published package also has a broken CLI entry: `bin.makemigration` still
points to `bin/makemigration.js`, while only `.mjs` exists. Lisa's former command
explicitly ran `.mjs`, but after the scoped package rename it still referenced
`node_modules/sequelize-auto-migrations` rather than `node_modules/@zeroteam/...`.
There is no working supported invocation left in the repository.

## Versions observed before cleanup and compatible fixes

Registry versions were read through `corepack yarn npm info`. Actual runtime
transitive versions were resolved relative to the installed Sequelize package,
not the root node_modules: the old generator also installs a separate validator
10.x, which can be hoisted to the root.

| Package              | Version observed before cleanup          | Conclusion                                                                                                                          |
| -------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| sequelize            | 6.37.8                                   | Current stable npm release; keep v6.                                                                                                |
| sequelize-typescript | 2.1.6                                    | Latest published version; supports Sequelize v6.                                                                                    |
| sequelize-cli        | 6.6.5                                    | Latest release, but unused by the current workflow.                                                                                 |
| dottie               | 2.0.6                                    | Compatible security patch 2.0.7 satisfies Sequelize's `^2.0.6`.                                                                     |
| moment               | 2.29.4                                   | Patched 2.31.0 satisfies `^2.29.4`.                                                                                                 |
| validator            | 13.12.0                                  | Latest 13.15.35 satisfies `^13.9.0` and includes the security fixes.                                                                |
| uuid                 | 8.3.2 under Sequelize                    | Advisory fixes begin at 11.1.1; this is outside Sequelize's `^8.3.2`. Do not force a major override without checking compatibility. |
| glob / inflight      | 7.2.0 / 1.0.6 under sequelize-typescript | Legacy dependency notices remain because the wrapper pins glob exactly.                                                             |

Sequelize v7 is published separately as `@sequelize/core` and remains alpha in
its official documentation. It includes substantial API/dialect/decorator
migration work; updating to it is not necessary to remove the old v4 generator
or refresh the compatible runtime dependencies.

The existing lockfile explains why runtime transitive versions are stale despite
compatible ranges: updating the top-level Sequelize package does not automatically
refresh every already locked transitive version. A targeted recursive Yarn update
can refresh dottie, moment and validator without changing ORM major versions.

The UUID advisory covers v3/v5/v6 functions with output buffers. The inspected
Sequelize v6 call sites use v1/v4; this limits the relevance of that particular
advisory to those call sites, but is not a complete exploitability assessment.

## Additional schema-management concern

Before the SQL-only startup fix, `bot/src/gateway.ts` called `sequelize.sync({ alter: false, force: forceSync })`
on startup, in addition to SQL migrations. Even with `alter: false` and
`force: false`, Sequelize can create missing tables and indexes. With
`DB_FORCE=true`, it drops/recreates tables. Therefore deployment migrations were not the only code capable of changing
the schema.

The fix removes that call and all application/Compose/example configuration for
`DB_FORCE`. Gateway startup now authenticates only; SQL migrations own schema
changes. A development reset remains an explicit operation on disposable data.

## Implemented cleanup and remaining work

1. **Implemented:** removed the automatic generator, Sequelize CLI, and the
   unused CLI-only `sequelize.cjs` config. Retained the ORM, SQL migration files,
   history tables, runtime `sequelize.js` config, and migrate service.
2. **Implemented:** updated dottie to 2.0.7, moment to 2.31.0 and validator to
   13.15.35 within their existing dependency ranges. Also updated semver 5.7.1
   to 5.7.2 to fix a remaining development tooling advisory.
3. **Audited:** Sequelize 4 is absent from the backend lockfile. Both production
   and full audits now have zero critical/high findings; see the updated audit
   report for the remaining moderate advisories and deprecation notices.
4. **Implemented:** removed startup synchronization and checked every ORM table,
   column and declared index against SQL-only schemas on fresh and upgraded
   PostgreSQL databases. Nexus create/claim/result and representative ORM writes
   also pass. No production database was accessed.

## Sources

- [Fork changes compared with original Lisa dependency](https://github.com/zero-team-pro/sequelize-auto-migrations/compare/a063aa6535a3f580623581bf866cef2d609531ba...master)
- [Sequelize version policy](https://sequelize.org/releases/)
- [Sequelize v7 upgrade guide](https://sequelize.org/docs/v7/other-topics/upgrade/)
- [Sequelize TypeScript field declarations](https://sequelize.org/docs/v6/other-topics/typescript/)
- [dottie advisory](https://github.com/advisories/GHSA-r5mx-6wc6-7h9w)
- [moment advisory](https://github.com/advisories/GHSA-4p3w-j4w9-5jqw)
- [validator advisory](https://github.com/advisories/GHSA-vghf-hv5q-vc2g)
- [UUID advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- [Existing backend audit](backend-dependency-audit.md)

## Confirmed bootstrap prerequisite — 2026-10-15

During isolated Nexus conversation migration tests, migration 1 failed on an
empty PostgreSQL 17 database because `enum_server_modules` is referenced but
never created by the SQL migration chain. Upgrade tests explicitly supply that
existing enum before migrating to v5; this does not validate clean bootstrap.
This is now fixed in migration 1 with a guarded `CREATE TYPE`, as explicitly
requested by the owner. Only the missing type is created; existing types/labels
are not altered. Future enum changes require numbered forward migrations.
The down migration deliberately does not drop this type, because it can predate
SQL migrations and may still be referenced by other objects.

## SQL-only verification — 2026-10-15

- Real `golang-migrate` applies migrations 1–6 to an empty PostgreSQL 17 database
  without manually creating enum types and without calling Sequelize sync.
- A second database starts with an existing enum containing an extra historical
  label, applies migrations through v5, and receives seeded server/task records.
  Updating to v6 preserves those records and the enum labels. Migration tracking
  prevents migration 1 from running again on already migrated instances; this
  migration runner does not enforce historical file checksums.
- `bot/tests/schema-migrations-db.test.mjs` selects every mapped column of every
  registered ORM model, checks model indexes by their leading columns (and exact
  columns for uniqueness), writes all supported server module values and basic
  admin/Telegram/Discord/AI-owner records, exercises Nexus create/claim/result,
  and repeats model reads in a read-only transaction. No AI/Telegram requests.
- The tests run in disposable, network-isolated databases named
  `lisa_schema_test` and `lisa_schema_upgrade_test`. No production reset,
  environment update, or manual database seed is needed for deployment.
- Existing schema differences not previously changed by `sync({ alter: false })`
  are not rewritten: this change does not alter existing column types or data.

Reproduce with Docker and backend dependencies installed:

```bash
./scripts/test-schema-migrations.sh
```

The script builds the backend, uses local images with `--pull never`, runs the
fresh/upgrade and Nexus regressions, and removes its isolated PostgreSQL container.
