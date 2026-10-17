# Local development with hosted VAuth

The owner's registered VAuth credentials and a generated product cookie secret
are already in the ignored repository root `.env`. The selected separate Neon
`neondb` database is configured and migrated. Owner login, `/api/me` and repeat
sign-in passed on 17 October 2026. Keep these values
server-side and preserve this file when following the new-contributor README.

## After logging in to Neon

1. Create a separate project named `vinventory-dev` for this application.
   Use the default PostgreSQL version and a region near your development
   location. This project is for development data only.
2. Open the project's **Connect** dialog. Select its default branch, database
   and database role. The default database name, such as `neondb`, is fine.
3. Select a direct PostgreSQL connection (turn connection pooling off) and copy
   the connection string. Preserve its SSL/channel-binding query parameters.
   VInventory uses `pg` and its own VAuth adapter; Neon Auth is not required.
4. Set `DATABASE_URL` in `LabInventoryTracker/.env` to the complete connection
   string and save. Keep the existing VOSS, callback, origin and cookie values.
   Do not paste the connection string into chat or commit the file.
5. From the inner repository root, run:

   ```powershell
   pnpm --filter @vinventory/db db:migrate
   pnpm dev
   ```

6. Open `http://localhost:5173`, select **Sign in with VAuth**, and use your own
   verified mailbox. After returning, visit `http://localhost:5173/api/me` to
   inspect the authenticated local user. Repeat sign-in should preserve the
   same local user ID. The header shows your signed-in account and a **Sign out**
   button. Live sign-out and the landing-to-labs flow are verified; full
   role-boundary acceptance remains pending.

First-admin setup and unassigned-user onboarding are the next implementation
steps. A successful login does not yet give the owner `system_admin`.

Neon reference: [Connect to Neon](https://neon.com/docs/get-started/connect-neon).
