# Backend dependency audit

Audit date: 2026-10-15. Run with Yarn 4.17.1 on Node 24.16.0 after the backend
dependency update. The user authorized sending package names and versions to the
npm advisory service. The admin frontend is outside this audit.

## Results

- Production dependency findings: **39 → 8** after compatible transitive updates.
- Remaining production entries: **5 vulnerability advisories and 3 deprecation notices**.
- Remaining production severities, including deprecations: **0 critical, 1 high, 7 moderate**.
- Full dependency tree, including devDependencies: **19 entries**; **4 critical**,
  **2 high**, and **13 moderate**, including deprecation notices.
- Audit exits with status 1 because unresolved findings remain. This is not a clean security audit.

Compatible fixes updated Babel runtime/tooling, brace-expansion, minimatch,
proxy-addr, diff, tar, underscore, undici, browserslist, cross-spawn, js-yaml,
picomatch, and shell-quote within their existing dependency ranges. In particular,
proxy-addr is now 2.0.8, removing the critical advisory present in the first run.

## Remaining production findings

| Package       | Versions      | Severity | Advisory / notice                                             |
| ------------- | ------------- | -------- | ------------------------------------------------------------- |
| `dottie`      | 2.0.6         | moderate | [advisory](https://github.com/advisories/GHSA-r5mx-6wc6-7h9w) |
| `glob`        | 7.2.0         | moderate | Deprecation notice                                            |
| `inflight`    | 1.0.6         | moderate | Deprecation notice                                            |
| `moment`      | 2.29.4        | moderate | [advisory](https://github.com/advisories/GHSA-4p3w-j4w9-5jqw) |
| `prom-client` | 15.1.3        | moderate | Deprecation notice                                            |
| `uuid`        | 8.3.2, 10.0.0 | moderate | [advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |
| `validator`   | 13.12.0       | moderate | [advisory](https://github.com/advisories/GHSA-9965-vmph-33xx) |
| `validator`   | 13.12.0       | high     | [advisory](https://github.com/advisories/GHSA-vghf-hv5q-vc2g) |

## Deferred Sequelize review

**Pending — explicitly deferred by the user.** Wait for the user to define what
to check before starting a focused Sequelize review or database integration checks.

The audit itself reports:

- Runtime Sequelize 6.37.8 dependencies: dottie, moment, validator, and uuid.
- The dev dependency `@zeroteam/sequelize-auto-migrations@1.1.0` also brings
  Sequelize **4.44.4**, responsible for all four remaining critical findings in
  the full tree. This package is installed in the current image because the
  Docker build installs devDependencies too. A dev dependency label does not
  prove exploitability or safety; its use/removal needs the deferred review.
- UUID also appears under Dockerode. No forced major-version overrides were applied.

These are dependency graph findings only. Reachability and exploitability in
Lisa have not been assessed as part of the deferred review.

## Full remaining tree

| Package                  | Versions             | Severity | Advisory / notice                                             |
| ------------------------ | -------------------- | -------- | ------------------------------------------------------------- |
| `deep-diff`              | 0.3.8                | moderate | Deprecation notice                                            |
| `dottie`                 | 2.0.6                | moderate | [advisory](https://github.com/advisories/GHSA-r5mx-6wc6-7h9w) |
| `glob`                   | 10.5.0               | moderate | Deprecation notice                                            |
| `inflight`               | 1.0.6                | moderate | Deprecation notice                                            |
| `moment`                 | 2.29.4               | moderate | [advisory](https://github.com/advisories/GHSA-4p3w-j4w9-5jqw) |
| `prom-client`            | 15.1.3               | moderate | Deprecation notice                                            |
| `semver`                 | 5.7.1                | high     | [advisory](https://github.com/advisories/GHSA-c2qf-rxjj-qqgw) |
| `sequelize`              | 4.44.4               | critical | [advisory](https://github.com/advisories/GHSA-wrh9-cjv3-2hpw) |
| `sequelize`              | 4.44.4               | moderate | [advisory](https://github.com/advisories/GHSA-8c25-f3mj-v6h8) |
| `sequelize`              | 4.44.4               | critical | [advisory](https://github.com/advisories/GHSA-f598-mfpv-gmfx) |
| `sequelize`              | 4.44.4               | critical | [advisory](https://github.com/advisories/GHSA-vqfx-gj96-3w95) |
| `sequelize`              | 4.44.4               | critical | [advisory](https://github.com/advisories/GHSA-v8fg-2rw7-q452) |
| `sprintf-js`             | 1.0.3                | moderate | [advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) |
| `terraformer`            | 1.0.12               | moderate | Deprecation notice                                            |
| `terraformer-wkt-parser` | 1.2.1                | moderate | Deprecation notice                                            |
| `uuid`                   | 3.4.0, 8.3.2, 10.0.0 | moderate | [advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |
| `validator`              | 10.11.0              | moderate | [advisory](https://github.com/advisories/GHSA-qgmg-gppg-76g5) |
| `validator`              | 10.11.0, 13.12.0     | moderate | [advisory](https://github.com/advisories/GHSA-9965-vmph-33xx) |
| `validator`              | 10.11.0, 13.12.0     | high     | [advisory](https://github.com/advisories/GHSA-vghf-hv5q-vc2g) |

Reproduce from `bot`:

```bash
corepack yarn npm audit --all --recursive --environment production
corepack yarn npm audit --all --recursive
```

The production graph and full graph are reported separately. Package-level
deprecation warnings are not counted as proven security vulnerabilities.
