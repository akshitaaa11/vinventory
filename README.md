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

## Run locally for testing

The current local `.env` already contains the registered VAuth settings and
the Neon `neondb` connection. Its initial migration has been applied. Keep this
file; you do not need to recreate the database or copy the template again.

Open PowerShell in the **inner repository folder** that contains `package.json`:

```powershell
cd "D:\Web development\LabInventoryTracker\LabInventoryTracker"
pnpm dev
```

Keep that terminal running. This starts the Vite frontend on
`http://localhost:5173`, the API on `http://127.0.0.1:3000`, and the worker
watcher (currently idle). Stop them with **Ctrl+C**. After editing `.env`, stop
and restart `pnpm dev` to load the new settings.

To check the app manually:

1. Open [VInventory](http://localhost:5173). This is the public landing page,
   introducing the product and its audiences.
2. Select **Sign in with VAuth** and complete the code sent to your college
   mailbox. Internet access is required for hosted VAuth and Neon; neither
   service needs to run on your machine.
3. Sign-in returns to [the labs directory](http://localhost:5173/labs). It
   lists active labs from the database and supports search by name, code or
   location. If you already have a session, use **Go to labs** on the landing
   page; your name/initials and a **Sign out** button appear in the header.
4. To check your identity, open
   [the current user endpoint](http://localhost:5173/api/me) in the same browser.
   A successful login returns your local user as JSON. Before login it returns
   `401` with `authentication_required`.
5. Use **Sign out** in the header to revoke the local session and return to the
   landing page. Sign in again and check that the local user ID stays the same.

The current owner account retains the existing `student` default and has no
lab membership. If no labs have been configured, the directory explicitly says
**No labs have been added yet**. This is a setup state, not a failed login.
Unassigned onboarding, first-admin setup and M201 provisioning remain pending.
Stock imports are now under `/labs/:labId/import`, available from a lab's
overview only to authorized staff. Browsing the directory does not grant stock
permissions. No sample labs or synthetic inventory are added to the real database.

The interface uses the supplied VERP design system's semantic blue/neutral
colors, small corner radii and self-hosted Geist/Geist Mono fonts, with light
and dark themes. Tracked styles live in `apps/web/src/theme.css` and `styles.css`.

Use `localhost:5173` exactly in the browser, including for `/api/me`. Vite
proxies `/api` and `/auth` to the API; opening the API's `127.0.0.1` address
directly does not share the browser's localhost session cookie. If port 5173
or 3000 is already in use, stop the earlier development server before retrying;
keep the registered browser port unchanged. If the API or VAuth cannot be reached,
the page shows a connection error and retry action instead of a silent sign-in.

## Automated checks

Run these from the same inner repository folder, in another terminal if the
development servers are running:

```powershell
pnpm test       # Automated tests
pnpm typecheck  # TypeScript checks
pnpm build      # Production builds
pnpm verify     # All three, in sequence
```

Automated tests use mocks and isolated fixtures; they do not replace the manual
hosted-login check above.

## First-time setup on a new environment

```powershell
pnpm install
Copy-Item .env.development.example .env
```

Only copy the template when `.env` does not already exist. Fill in the
VInventory development `DATABASE_URL`, registered `VOSS_CLIENT_ID` and
`VOSS_CLIENT_SECRET`, and a random `COOKIE_SECRET` of at least 32 characters.
Keep the template's hosted discovery URL, localhost origin and registered
callback. See [Neon development setup](./docs/local-development.md).

Then apply the schema and start the app:

```powershell
pnpm --filter @vinventory/db db:migrate
pnpm dev
```

For an existing environment, run `db:migrate` when new migrations are added.
The API expects VInventory to be registered as an OIDC client in VAuth with
the exact redirect URI configured in `VAUTH_REDIRECT_URI`.

Open `http://localhost:5173` exactly. Vite keeps that port fixed and proxies
`/api` and `/auth` to the internal API. Hosted VAuth returns to the registered
`http://localhost:5173/api/auth/oauth2/callback/voss` handler. Configure
`VOSS_CLIENT_ID`, `VOSS_CLIENT_SECRET` and the hosted `VOSS_DISCOVERY_URL`;
legacy `VAUTH_CLIENT_ID`/`VAUTH_CLIENT_SECRET`/`VAUTH_ISSUER` remain supported,
and conflicting aliases are rejected. See [authentication](./docs/authentication.md).

API development/start and Drizzle commands load this repository's root `.env`
even when pnpm runs from a package folder. Existing process variables take
precedence. With `NODE_ENV=production` already set in the host environment,
local `.env` loading is skipped; deploy `scripts/load-env.mjs` with the API and
set all required values in the host. The frontend does not load this secret file.

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

1. Align hosted VAuth/local callbacks, implement unassigned onboarding and first-admin setup, and verify owner-led access/testing.
2. Implement returnable-equipment checkout and confirmed returns.
3. Add extensions and reliable reminder processing.
4. Pilot the lending workflow before completing inventory accounting.

Actual item/loan collection, the incharge's account, pilot date and formal
sign-off remain required before the live pilot, even while development proceeds.
