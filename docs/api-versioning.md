# HTTP API versioning

## Decision

Lisa versions public machine-to-machine HTTP APIs in the URL. Versioning is
scoped to an API domain rather than to the entire application:

```text
/{domain}/v{major}[/{resource-or-action}]
```

Examples:

```text
POST /notify/v1
GET  /server/v1/:guildId
POST /telegram/v1/articles
POST /mastercard/v1/conversion-rate
```

`GET /module/v1` is the public, read-only module and command catalog used by
Lisa's public web page. Other application routes keep their domain-specific
authorization requirements.

This lets `/notify/v2` coexist with `/server/v1`; changing one domain does not
require releasing new versions of unrelated endpoints. A global prefix such as
`/api/v1` must not be introduced.

## What is a domain?

A domain is a cohesive API surface with one lifecycle and one set of clients,
such as `notify`, `server`, or `telegram`. Endpoints that are expected to evolve
together should use the same domain version. A single operation should not get
its own independent version unless it is genuinely a separate API product.

## When to increase the major version

Create the next major version when an existing client could stop working, for
example when:

- a field is removed or renamed;
- a field type, meaning, or format changes;
- a previously optional input becomes required;
- authentication requirements change incompatibly;
- response status codes or error semantics change incompatibly;
- the operation's behavior changes while the request remains the same.

The following compatible changes stay in the current major version:

- adding a new endpoint to the domain;
- adding an optional request field;
- adding a response field that clients are expected to ignore when unknown;
- fixing behavior that was clearly outside the documented contract;
- performance and internal implementation changes.

## Route organization

Each domain is mounted once in the gateway. `createVersionedRouter` owns the
major-version segment and deliberately exposes no unversioned fallback:

```ts
const notify = createVersionedRouter({ v1: notifyV1, v2: notifyV2 });
app.use('/notify', notify); // /notify/v1 and /notify/v2
```

Do not branch on a URL version inside a handler or service. The selected router
is the version boundary.

### Layers

Code in an API domain has three responsibilities:

1. A route factory declares HTTP methods and paths once.
2. Version handlers own request validation, authorization for the operation,
   service input mapping, status codes, and response mapping.
3. Services own reusable business logic and must not depend on Express or the
   HTTP major version.

For an existing domain that currently has one inline Express router, that router
is its `v1` contract. Extract a route factory and handler map before adding
`v2`; do not duplicate the inline router.

### Adding a version without copying a domain

A route factory receives the complete handler map:

```ts
type ArticleHandlers = {
  list: RequestHandler;
  get: RequestHandler;
  save: RequestHandler;
};

const createArticleRouter = (handlers: ArticleHandlers) =>
  Router()
    .get('/article/list', handlers.list)
    .get('/article/:id', handlers.get)
    .post('/article/:id/save', handlers.save);
```

The next major version replaces only handlers whose HTTP contract changed:

```ts
const v1Handlers = { list, get: getV1, save };
const v2Handlers = extendVersionHandlers(v1Handlers, { get: getV2 });

const v1 = createArticleRouter(v1Handlers);
const v2 = createArticleRouter(v2Handlers);
```

Here `list`, `save`, the route declarations, and all services remain shared.
Only `getV2` is new. Never copy ten endpoint files merely to change one of
them.

Handlers released for an old version are stable contract adapters. Shared
services may evolve only while their observable behavior remains compatible for
every version using them. If behavior must differ, pass an explicit operation or
strategy from the version handler instead of checking the API version in the
service.

Each supported version retains contract tests. Service unit tests are shared.
Router tests must also verify that an unversioned domain URL returns `404`.

## Legacy routes and deprecation

Unversioned application routes were removed when this standard was adopted.
Lisa does not provide implicit aliases such as `/notify` for `/notify/v1`.

For a future removal, keep the old explicit version (`/notify/v1`) during an
explicit transition period when compatibility is required. When clients can
consume them, use standard `Deprecation`, `Sunset`, and `Link` headers to
communicate the successor (`/notify/v2`). Removing a supported version requires
an inventory and migration of known clients.

## APIs that do not require versions

Infrastructure paths that are not application API contracts remain unversioned:

- `/metrics`;
- `/static`.

OAuth routes belong to the versioned `auth` domain because their callback URL is
part of deployed configuration. If an infrastructure path later becomes a
supported integration contract, version that domain from that point onward.

## Initial v1 migration

The initial migration is atomic and intentionally keeps no legacy aliases:

```text
/auth/*                         -> /auth/v1/*
/vm/*                           -> /vm/v1/*
/notify                         -> /notify/v1
/server/*                       -> /server/v1/*
/channel/*                      -> /channel/v1/*
/module                         -> /module/v1
/admin/*                        -> /admin/v1/*
/telegram/*                     -> /telegram/v1/*
/vpn/outline/*                  -> /vpn/outline/v1/*
/mastercard/*                   -> /mastercard/v1/*
```

`/metrics` and `/static` retain their infrastructure paths. Internal clients
and the Discord OAuth redirect URI must move in the same release as the gateway.

## Review checklist

Before merging a new or changed public endpoint, verify that:

1. Its domain and major version are explicit in the URL.
2. An incompatible change uses a new domain major version.
3. Compatible changes do not create unnecessary versions.
4. Old versions retain contract tests while they are supported.
5. Migration and removal of a legacy version are documented.
