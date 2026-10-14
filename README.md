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
copy .env.development.example .env
pnpm --filter @vinventory/db db:migrate
pnpm verify
pnpm dev
```

Replace every sample secret and database URL before starting the API. The API
expects VInventory to be registered as an OIDC client in VAuth with the exact
redirect URI configured in `VAUTH_REDIRECT_URI`.

Environment-specific templates are provided for development, test, and
production. Never commit populated `.env` files.

## Phase 1 foundation

- PostgreSQL/Neon schema: 23 Drizzle tables with a generated initial migration.
- Identity: VAuth authorization-code flow with PKCE S256, state, and nonce.
- Sessions: opaque, signed browser cookies backed by hashed local sessions.
- Authorization: app-owned account types and lab membership permissions,
  enforced in API pre-handlers.
- Verification: `pnpm verify` runs all type checks, tests, and production builds.

See [`docs/authentication.md`](./docs/authentication.md) for the VAuth contract
and [`docs/phase-1-pilot-checklist.md`](./docs/phase-1-pilot-checklist.md) for
the incharge-owned operational inputs required before the real pilot begins.

## Delivery order

The app includes a CSV/Excel (`.csv` / `.xlsx`) returnable-item import screen
with a downloadable CSV template, row preview, validation, and transactional
imports. Imported stock awaits physical verification. See
[`docs/inventory-import.md`](./docs/inventory-import.md) for setup and format.
Real pilot data collection is deferred; development can continue meanwhile.

1. Confirm pilot-lab workflow and VAuth integration.
2. Implement returnable-equipment checkout and confirmed returns.
3. Add extensions and reliable reminder processing.
4. Pilot the lending workflow before completing inventory accounting.
