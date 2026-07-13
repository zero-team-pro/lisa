# Lisa project context

This file is the repository-side entry point for project context that lives
outside the codebase.

## Locations

- Local repository: `/Users/platonefimov/sources/lisa`
- Cloud repository: <https://github.com/zero-team-pro/lisa>
- Local Nexus vault: `/Users/platonefimov/Library/Mobile Documents/iCloud~md~obsidian/Documents/Nexus`
- Nexus project hub: `Projects/Lisa/Lisa.md`
- Absolute Nexus project hub: `/Users/platonefimov/Library/Mobile Documents/iCloud~md~obsidian/Documents/Nexus/Projects/Lisa/Lisa.md`

The Nexus vault is synchronized through iCloud. On another Mac, locate the
vault first and then open `Projects/Lisa/Lisa.md`; the absolute path above is
specific to this machine.

## Source of truth

- Keep implementation, architecture, runtime requirements, and development
  commands in this repository.
- Keep current status, priorities, decisions, and relationships with other
  projects in the Nexus project hub.
- When a code change affects architecture or operation, update the relevant
  repository documentation and then update the `Last reviewed` section in the
  Nexus project hub.
- When priorities or project relationships change, update Nexus. Change this
  file only if a location, source-of-truth rule, or durable entry point changes.

## Technical entry points

- [`README.md`](README.md) — overview and local setup.
- [`docker-compose.yml`](docker-compose.yml) — services and runtime topology.
- [`bot/README.md`](bot/README.md) — bot-specific documentation.
- [`bot/src/modules`](bot/src/modules) — feature modules and commands.
- [`bot/src/api`](bot/src/api) — HTTP API.
- [`bot/src/models`](bot/src/models) — persistent models.
- [`bot/src/migrations`](bot/src/migrations) — database schema migrations.

## Project-context handoff

For an agent or developer starting from this repository:

1. Read this file and `README.md`.
2. Open the Nexus project hub for current priorities and related projects.
3. Treat Git and the repository files as authoritative for implementation
   state; treat Nexus as authoritative for planning state.
4. Before finishing a material change, check whether either side's entry point
   needs its review date, links, or durable facts updated.
