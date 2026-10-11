# VInventory

Lab inventory and borrowing system, rebuilt from the lending-first plan.

## Workspace

- `apps/web` — React and Vite browser application
- `apps/api` — Fastify HTTP API and domain services
- `apps/worker` — scheduled reminder worker
- `packages/db` — Drizzle schema, database connection, and migrations
- `packages/contracts` — shared Zod request/response contracts
- `docs` — schema, ER diagram, operating notes, and architecture decisions

## Requirements

- Node.js 22.12 or newer
- pnpm 11
- PostgreSQL (Neon for shared environments)

## Local setup

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm dev
```

Copy `.env.example` to `.env` and replace its sample values before starting
services that require a database.

## Delivery order

1. Confirm pilot-lab workflow and VAuth integration.
2. Implement returnable-equipment checkout and confirmed returns.
3. Add extensions and reliable reminder processing.
4. Pilot the lending workflow before completing inventory accounting.
