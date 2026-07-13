# Repository instructions

## HTTP API versioning

Read [`docs/api-versioning.md`](docs/api-versioning.md) before adding or changing
an HTTP endpoint.

- Version public machine-to-machine API contracts in the URL at the domain
  level: `/{domain}/v{major}[/{resource-or-action}]`.
- A version belongs to one API domain, not to the whole Lisa API. For example,
  `notify` and `server` advance independently.
- Do not introduce a global `/api/v1` prefix.
- Increase the major version only for a backward-incompatible contract change.
- Compatible additions stay in the current version.
- Infrastructure and browser-flow routes such as `/metrics`, `/static`, and
  OAuth callbacks do not need versioning.
- Do not expose an unversioned fallback for a versioned domain. When replacing
  a supported version, define an explicit migration or deprecation period.
- Build version routers from reusable route factories and handler maps. A new
  major version overrides only changed contract handlers; do not copy an entire
  domain or its services.
- Keep Express request validation and response mapping in version handlers.
  Keep shared business logic in services that do not know the HTTP version.
