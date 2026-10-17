# VInventory — Lab Inventory and Borrowing System Plan

Created: 8 October 2026

Refined: 17 October 2026

Status: Technical foundation and CSV/Excel item import implemented. M201 VLSI Lab, Ajit Ghadge, and lending defaults confirmed by the project owner. Hosted VAuth, registered localhost callback, environment loading and token verification are aligned. Separate Neon `neondb` setup/migrations, live owner login, `/api/me` and repeat identity preservation were verified on 17 October 2026. Next: implement unassigned-user onboarding and first-system-admin setup. Actual item/loan collection remains deferred; operational sign-off is pending.

Delivery decision: Follow a lending-first MVP, then complete single-lab inventory, then expand to independently managed labs and shared discovery.

## 1. Purpose and scope

Start with one engineering lab, establish accurate inventory and borrowing records, then add independently managed labs and shared component discovery. This is a lab component and tool management system, not a full college inventory or accounting system.

The system must answer:

1. What components and tools does this lab own?
2. What is currently available, borrowed, damaged or awaiting testing?
3. Who holds each returnable item?
4. When is it due back?
5. After expansion, which participating lab has the required component?

The complete single-lab scope includes components, electronic boards, tools, consumables, issue/return records, due dates, configurable policies and the incharge's complete lab inventory view. The first release covers returnable-item lending and reminders; the full catalogue and consumable balances follow after the lending pilot. A lightweight stable item list is required from the first release, but a full catalogue is not a release blocker. Procurement approvals, depreciation, college-wide accounting and automated physical tracking are outside the initial scope.

## 2. Agreed requirements

| Requirement | Expected behavior |
|---|---|
| Start with one lab | Pilot the workflow before expanding |
| Complete lab inventory | Incharge sees all stock belonging to their lab |
| Student discovery | Students search models, specifications and availability |
| Loose components | No student identity or return date required; record consumption |
| Essential tools | Record borrower, issued units/quantity and agreed due date |
| Project equipment | Record borrower and project purpose with a longer agreed loan |
| Lab-controlled policies | Incharge selects categories and rules for their lab's stock |
| Reliable returns | Staff confirm physical receipt and condition |
| Multi-lab expansion | Separate ownership, balances, permissions and loan records |
| Shared inventory | Search across labs while each incharge controls their own stock |
| Independent owner testing | Owner can bootstrap their own system-admin account and test other roles using isolated fixtures |
| Deferred data intake | Import returnable items later from CSV/Excel; no fabricated pilot records |
| Borrower register | Name, roll number, item/model, issued date, due date, actual return date, purpose and verifier |

Confirmed pilot: **M201 VLSI Lab**, code **M201**, location **201 M-block VIT**.
**Ajit Ghadge** is the responsible incharge and checkout/return operator.
The pilot start date and his actual VAuth identity are still required before
live operation. The project owner is the intended first system administrator;
their exact verified account must be selected during setup.

## 3. Categories and configurable policies

Categories are presets, not universal rules fixed by component name.

| Preset | Examples | Borrower required | Return required | Suggested duration |
|---|---|---|---|---|
| Loose / consumable | Resistors, capacitors, cut wire | No | No | Not applicable |
| Essential / short-term loan | Multimeter, soldering station, reusable battery | Yes | Yes | 3–4 days |
| Project / longer-term loan | Raspberry Pi 5, Jetson, FPGA board | Yes | Yes | More than one week; e.g. 14 days |

Durations are editable defaults. The agreed due date is set at issue. Battery treatment depends on whether it is reusable or expendable and on the lab's policy.

For M201, the accepted defaults are **4 days for Essential** and **14 days for
Project**. Both require approval and allow extensions; Project also requires
purpose. Loose consumables remain outside the lending MVP.

### Incharge settings per lab stock entry

- Category and optional custom category name.
- Tracking method: individual units or quantity.
- Borrower identity required.
- Return required.
- Default loan duration.
- Approval required for returnable items.
- Project purpose/details required.
- Extensions permitted.
- Student eligibility or restrictions, when introduced.

For the MVP, returnable items must require an identified borrower and due date. Loose consumables must support issuance without student details. Labels can be customized, but these validations prevent contradictory policies.

Tracking method and borrowing policy are separate. Five interchangeable reusable sensors can be quantity-tracked while still requiring borrower details and return dates.

Policy changes apply to future issues. Existing loans retain a snapshot of their policy and agreed due date unless staff explicitly amend them with a recorded reason.

## 4. Inventory structure and accounting

### Separate model, stock and unit

- **Component model:** Shared definition such as Arduino Uno R3, exact specifications and photograph.
- **Lab stock:** A lab's holdings of that model, category, policy and storage location.
- **Physical unit:** Optional uniquely identified board/tool for individual tracking.

Use exact variants. Different Raspberry Pi memory variants or FPGA development boards must not be merged under a generic name.

Every stock entry has a lab ID from the first release. No multi-lab interface is required in the first release.

### Balances

For returnable stock, current owned quantity equals available + borrowed + awaiting testing + damaged/under repair + missing but not written off. Retired or written-off stock is historical and excluded from current totals.

For consumables, remaining stock equals opening stock + receipts - consumption + approved corrections. A wire entry may use meters rather than pieces; each stock entry has a defined unit of measure.

- A loan reduces available stock, not owned stock.
- A usable return increases available stock, not owned stock.
- Consumption reduces remaining stock.
- A newly received item increases owned/remaining stock.
- Corrections require a reason and responsible staff member.
- Transfers, when introduced, preserve explicit ownership and custody records.

Store inventory movements so balances and historical changes can be explained. Prevent negative available stock and duplicate active loans for the same unit.

## 5. Roles and access

| Role | Responsibilities and access |
|---|---|
| Unassigned identity (planned) | May authenticate, view access-pending status and sign out; no operational access until explicitly linked/authorized |
| Student | Browse permitted catalogue, request equipment, see own loans and request extensions |
| Lab incharge | Manage assigned lab stock and policies, approve requests, confirm issue/return, view borrowers and reports |
| Authorized lab staff | Delegated operations within assigned labs, according to permissions |
| System administrator (`system_admin`) | Application-wide administration, lab onboarding, policy/role assignment and cross-lab operations; privileged actions must be logged |

Students do not see other borrowers' personal details. Incharges manage only authorized labs. Inventory ownership and permissions must be enforced on the server, not merely hidden in the interface.

**Implementation status:** The backend already recognizes `system_admin` and
grants it the existing lab permissions. First-admin setup, account/lab management
tools, and an admin dashboard are not implemented. New identities currently
default to `student`; replacing that default with an explicit unassigned state
is a Phase 1 task, not completed behavior. Lab incharge is a lab-membership role,
not a role supplied by VAuth.

### First administrator and owner testing

- Build a trusted server-side setup command that promotes one explicitly
  selected, already authenticated VAuth identity to `system_admin`. Display the
  selected local user/subject and verified email for the operator to review.
- Never promote the first visitor automatically or trust a browser-supplied
  email, roll number or role. Make the command repeat-safe and audit the grant.
  A different initial target must not be silently promoted on a repeated run.
- Provide a repeatable setup path for M201 and its accepted policies so the
  owner can exercise inventory imports without asking the incharge to log in.
  Link Ajit Ghadge's actual account before live lab operation; do not impersonate
  him for testing. Keep test inventory separate from real pilot records.
- The full admin dashboard can follow the initial setup tools. Later role
  management must be restricted to system admins, audited, and prevent accidental
  removal of the last active administrator.
- Add isolated seeded identities for admin, incharge, restricted staff, student,
  and unassigned scenarios. Any local identity switcher must require
  `VINVENTORY_DEV_AUTH=1`, refuse production at runtime, fail production builds
  when enabled, and resolve roles from the real application database. This is
  planned tooling; it does not replace a real hosted-VAuth login test.

### Borrower identity and roll numbers

VAuth supplies a stable subject and verified email, not roll numbers or roles.
Keep borrower roll numbers as text in VInventory-owned records, preserving
letters and leading zeros. Staff must establish the borrower-record mapping;
a typed name or roll number cannot claim an existing person's record. Use the
provider-verified email to match an approved local record, then retain the stable
VAuth subject binding. Refuse and log attempts to rebind an already-linked record
to a different identity. Retry safe linking on later sign-ins if records were
not available earlier; failure to link leaves the user unassigned.

## 6. Core workflows

### A. Loose / consumable issue

1. Staff select component and quantity.
2. System validates available stock.
3. Staff confirm consumption; record time, staff and optional purpose.
4. Remaining stock decreases. No student identity, loan or due date is created.

Open bins may use batch consumption records and periodic counts. When withdrawals are not recorded individually, show the last verification date and treat displayed stock as an estimate between counts.

### B. Essential tool checkout

1. Student requests a tool, or staff start direct checkout at handover.
2. Staff verify the student's local identity, name and roll number, and check item eligibility for issue.
3. Staff select actual units/quantity and agree a due date, using M201's four-day Essential default where configured.
4. Staff confirm physical issue and starting condition.
5. System creates the loan and marks stock borrowed.
6. Staff confirm physical return and condition; working items become available.

### C. Project equipment checkout

Use the essential workflow with project purpose and a longer due date. For group projects, identify one responsible borrower and optionally associate team members. Extensions require approval and retain the previous date in history.

### D. Returns and exceptions

- Partial returns reduce only the outstanding quantity; the remainder stays on loan.
- Student-reported return does not make stock available until staff confirm receipt.
- Untested returns remain awaiting testing.
- Damaged returns become damaged or under repair.
- Lost items retain borrower and incident history; write-off is a separate staff action.
- Expected return dates are commitments, not guarantees of future availability.
- Due date is the agreed deadline. Actual return date is recorded only upon
  confirmed receipt; preserve separate dates and quantities for partial returns.

### E. Requests versus loans

Request states: pending, approved, rejected, cancelled, fulfilled.

Loan states: active, partially returned, closed. Overdue is calculated from outstanding items and the due date.

Approval alone does not mark an item borrowed. The MVP does not guarantee a reservation after approval; availability is rechecked during issue. Future reservations require explicit allocation and expiry rules.

## 7. Lab incharge dashboard

Show the complete inventory for the selected authorized lab, including consumables, essentials and project equipment.

| Item | Category | Current total | Available | Borrowed | Damaged/testing |
|---|---|---:|---:|---:|---:|
| 220 ohm resistors | Loose | 180 | 180 | Not applicable | 0 |
| Multimeters | Essential | 8 | 5 | 2 | 1 |
| Raspberry Pi 5 | Project | 5 | 2 | 2 | 1 |

Missing stock must have its own visible status/count where applicable. Total means remaining quantity for consumables and currently owned quantity for returnables. Do not add meters, pieces and device counts into a misleading single grand total; summarize by item and unit of measure.

Dashboard functions:

- Search/filter by component, category, condition and storage location.
- View unit details and inventory movements.
- View active loans, borrower details, upcoming returns and overdue items.
- Add receipts, record consumption and correct stock with reasons.
- Confirm issues, returns, extensions and condition changes.
- Manage the lab's categories and borrowing policies.
- Export inventory and loan reports.
- View last physical verification dates.

## 8. Refined phased implementation

### Phase 1 — Confirm the pilot workflow and technical foundations

**Goal:** Make local development independently usable with hosted VAuth and
explicit application permissions, while keeping live-pilot requirements visible.

Completed or confirmed:

- [x] Select M201 VLSI Lab, location 201 M-block VIT, and Ajit Ghadge as incharge/operator.
- [x] Record register fields, including borrower roll number and separate due/actual return dates.
- [x] Accept four-day Essential and fourteen-day Project defaults, permissions, and consumable exclusion.
- [x] Implement React/Vite, Fastify, PostgreSQL/Neon access, Drizzle schema/migrations, session and permission foundations.
- [x] Add CSV/Excel item import with preview, validation, duplicate rejection, transactional persistence and audit events.
- [x] Review the VAuth contract and the user-supplied `integrating.md` guide, including hosted authentication for local products.
- [x] Receive user-reported VInventory registration and credentials, with exact local/production callbacks. This is registration evidence, not a successful live login.

Next implementation sequence:

1. [x] Align hosted VAuth with the registered localhost callback. Adapter, callback, examples, aliases, root `.env` loading, EdDSA/JWKS and verified-email checks are implemented and tested. Separate Neon `neondb` migrations, hosted owner sign-in, `/api/me` and repeat local-user preservation are verified. Existing client used without re-registration; production routing remains a deployment check.
2. [ ] Add an explicit unassigned account state, reviewed schema/data migration, access-pending page, and server-side role allowlists. Require verified-email binding for local records; preserve stable subject IDs.
3. [ ] Implement and document the one-time first-system-admin setup command. The project owner signs in with their own account and is explicitly promoted; then provision M201 and its policies through trusted setup tools.
4. [ ] Add independent local role-testing fixtures and the guarded development identity switcher described in section 5. Never require shared credentials or another person's account to test permissions.
5. [ ] Verify hosted-VAuth login from `http://localhost:5173`, callback handling, `/api/me`, repeat login without duplicate users, local logout, unassigned access denial and intended admin/incharge/staff boundaries. Test inventory preview/import with synthetic records in the development database.

Deferred operational inputs (required before a live pilot):

- [ ] Collect actual item/model rows, quantities and stable unit IDs where applicable.
- [ ] Collect and reconcile outstanding loans, including name, roll number, issued date, due date, purpose and verifier; preserve actual return dates where present.
- [ ] Confirm approval, partial/damaged/late-return handling and remaining workflow decisions with the incharge.
- [ ] Link Ajit Ghadge's real VAuth account, set the pilot date and obtain formal incharge sign-off.

The import accepts Stock code, Item/model name, Tracking and Quantity, plus
semicolon-separated Asset tags for individual units. It supports `.csv` and
`.xlsx`, up to 2 MB/500 items/2,000 individual units, and does not import loans.
Imported holdings begin in `awaiting_testing`, not verified available stock.
See `docs/inventory-import.md` and `docs/phase-1-pilot-checklist.md`.

**Technical readiness:** Hosted login works locally; unassigned identities have
no operational access; the owner can administer and test the development lab;
permission, session and import checks pass. Automated tests alone do not prove
the live VAuth client works.

**Operational exit:** Real item/loan records are reconciled, the incharge's
access and workflow are verified, and the incharge accepts the pilot. Deferred
data does not prevent Phase 2 development, but Phase 1 must not be marked fully
complete until both technical readiness and operational exit are satisfied.

### Phase 2 — Returnable-equipment lending MVP

**Goal:** Replace the borrowing register with reliable digital possession records.

- [ ] Build staff checkout using a verified local borrower record with name and roll number, stable item reference, actual units/quantity and agreed due date.
- [ ] Provide controlled condition/verification handling needed to use imported stock; do not issue `awaiting_testing` units or silently treat imported balances as available. Keep broader inventory reconciliation in Phase 5.
- [ ] Suggest category defaults while allowing incharge overrides.
- [ ] Capture project purpose where required and condition at issue.
- [ ] Display active loans and borrower-specific history.
- [ ] Confirm full and partial returns with receiving staff and condition.
- [ ] Keep damaged/untested returns distinct from usable returns.
- [ ] Record edits and policy snapshots; prevent duplicate active issuance of individually identified units.
- [ ] Apply role/lab checks on the server and transactional writes.

**Deliverables:** Checkout, outstanding-loan dashboard and confirmed returns.

**Outcome:** Staff know who holds each recorded returnable item and when it is due.

**Exit criteria:** Partial returns remain outstanding correctly; students cannot modify official records; identified units cannot have overlapping active loans.

**Boundary:** Before verified stock is enabled, this release does not promise complete available quantities. Quantity-based loans have outstanding balances, but total-stock sufficiency cannot be guaranteed without verified opening stock.

### Phase 3 — Due dates, extensions and notifications

**Goal:** Reduce manual follow-up without creating excessive reminders.

- [ ] Add upcoming and overdue views based on outstanding quantities.
- [ ] Support extension requests, staff approval and due-date history.
- [ ] Notify borrower and responsible incharge/designated staff.
- [ ] Start with one pre-deadline reminder and one due/overdue notification; agree further escalation separately.
- [ ] Run scheduling outside the browser, log attempts and retry temporary failures.
- [ ] Prevent duplicate scheduling, recheck outstanding status before sending and cancel/reschedule after returns or extensions.
- [ ] Add basic loan exports and timezone-aware display.

**Deliverables:** Deadline management and tested notification processing.

**Outcome:** Staff can identify overdue loans; borrowers and responsible staff receive configured reminders.

**Exit criteria:** Closed loans produce no new reminders; extensions invalidate obsolete jobs; duplicate jobs do not cause repeated application sends. External provider timeouts require explicit handling rather than a claim of guaranteed exactly-once delivery.

### Phase 4 — Test and pilot the lending workflow

**Goal:** Prove usefulness in one lab before adding inventory features.

- [ ] Train operators and run a pilot for approximately 2–4 weeks, adjusted to transaction volume.
- [ ] Test issuance, partial/damaged returns, extensions, access restrictions and reminder failures.
- [ ] Check existing loan migration and sample records against physical custody.
- [ ] Measure logging completeness, checkout time, overdue visibility and manual follow-up effort.
- [ ] Verify backups/restoration before sustained use.
- [ ] Document setup, usage and maintenance for VOSS contributors.

**Deliverables:** Pilot findings, fixes and an operating guide.

**Outcome:** A dependable digital lending register, with explicit limits on inventory visibility.

**Exit criteria:** Staff consistently log returnable issues with borrower/due date; known discrepancies are resolved; recovery and notification behavior are verified.

**First release milestone:** Phases 1–4. Full inventory remains the next milestone.

### Phase 5 — Complete single-lab inventory

**Goal:** Add the full stock dashboard and student discovery promised by the product.

- [ ] Physically verify opening stock, condition, locations and units of measure.
- [ ] Reconcile existing active loans with opening owned/available balances without double deduction.
- [ ] Add model, lab stock and optional unit management.
- [ ] Add anonymous consumable issuance, batch consumption and count corrections.
- [ ] Add receipts, inspection states, damaged/missing stock and audit history.
- [ ] Calculate availability from verified stock and transactions.
- [ ] Add student search and the complete incharge inventory dashboard.
- [ ] Add inventory exports and last verification dates.
- [ ] Revalidate stock after actual use; optionally add QR unit/bin labels.

**Deliverables:** Full single-lab catalogue, stock accounting and configurable policies.

**Outcome:** All agreed single-lab requirements are fulfilled, including consumables and total inventory.

**Exit criteria:** Physical sample counts match records; consumption requires no student identity; double issue and insufficient-stock transactions are prevented; returned damaged stock stays unavailable.

### Phase 6 — Add a second independently managed lab

**Goal:** Validate expansion while preserving local control.

- [ ] Verify Lab B stock and assign authorized staff.
- [ ] Reuse exact model definitions while preserving distinct stock, locations and policies.
- [ ] Add lab selection and server-enforced permissions.
- [ ] Test different borrowing policies for the same model across labs.
- [ ] Document repeatable onboarding.

**Outcome:** Two labs manage their own complete inventory independently.

**Exit criteria:** No unauthorized cross-lab changes; shared model names do not mix balances; adding a lab preserves existing loans.

### Phase 7 — Shared discovery and lab-routed requests

**Goal:** Students find equipment across participating labs.

- [ ] Add cross-lab search by model, specifications, lab and availability.
- [ ] Display local borrowing rules and eligibility separately from availability.
- [ ] Route requests to the owning lab's incharge.
- [ ] Separate pending/approved requests from actual handover and loans.
- [ ] Recheck stock at handover; approval is not a guaranteed reservation.
- [ ] Show expected returns as estimates and keep borrower identity private.

**Outcome:** Students find Arduino stock in Labs A/B and a specific Spartan 6 board available only in Lab B.

**Exit criteria:** Search reflects local records, requests reach the right lab, and local policies remain enforced.

### Phase 8 — Optional collaboration and analytics

Add only after confirmed need:

- [ ] Inter-lab transfers with dispatch/receipt and ownership/custody separation.
- [ ] Project kits and contents checks.
- [ ] Reservations with explicit allocation, collection deadlines and expiry.
- [ ] Maintenance history, low-stock alerts and utilization reports.

**Outcome:** More collaboration without sacrificing stock accountability.

**Exit criteria:** Each new workflow has responsible operators and tested exceptions.

## 9. Minimal conceptual data model

| Entity | Main information |
|---|---|
| Lab | Name, location, timezone, active status |
| User and lab role | Stable VAuth identity, explicit unassigned/student/staff/system-admin state, lab membership and permissions |
| Borrower profile (planned) | Roll number as text, verified-email matching and stable link to the local user; VAuth supplies no roll number |
| Component model | Exact model, specifications, photo, searchable aliases |
| Lab stock | Lab, model, storage location, unit of measure, policy, tracking method |
| Physical unit | Unique ID, lab stock reference, condition/status |
| Inventory movement | Receipt, consumption, issue, return, adjustment; quantity, staff, time, reason |
| Request | Student, requested stock/quantity, purpose, dates, approval status |
| Loan and loan line | Borrower, issued units/quantities, due date, outstanding quantity, policy snapshot |
| Return record | Loan line, quantity/unit, condition, actual return date/time and receiving staff; separate from the due date |
| Extension record | Previous/proposed due date, reason and approval |
| Audit event | Actor, action, affected record and change history |

Consumption movements do not require a student reference. Returnable loans do. Confirmed stock-changing operations must be atomic and consistent.

This is the target conceptual model. The current schema still defaults users
to `student` and has no dedicated borrower roll-number profile. Implement these
changes through reviewed migrations, preserving existing user IDs, sessions and
loan references. Review existing default-student records; do not assume they
represent approved students or indiscriminately rewrite assigned roles.

## 10. Required validation scenarios

- [ ] Issue 20 resistors without student details; deduct stock and create no loan.
- [ ] Consume wire in meters; retain its unit of measure.
- [ ] Issue a multimeter with student and four-day due date.
- [ ] Issue Raspberry Pi 5 with project purpose and longer due date.
- [ ] Approve a request without marking stock borrowed.
- [ ] Handle two simultaneous attempts to issue the last unit.
- [ ] Return two of three borrowed sensors; one stays outstanding.
- [ ] Receive a damaged board without making it available.
- [ ] Approve an extension and preserve date history.
- [ ] Change a policy without modifying existing loans.
- [ ] Show one lab's complete inventory with correct status totals.
- [ ] Prevent unauthorized cross-lab edits.
- [ ] Show Arduino stock separately for Labs A and B.
- [ ] Find a Spartan 6 board located only in Lab B.
- [ ] Confirm backup restoration before sustained live use.

## 11. Milestones and current progress

| Milestone | Included phases | Completion evidence |
|---|---|---|
| Validated lending MVP | 1–4 | Returnable loans, due dates, notifications and successful pilot |
| Complete single-lab inventory | 5 | Verified stock, consumables, catalogue and full dashboard |
| Multiple independent labs | 6 | Separate stock, rules and permissions |
| Shared lab inventory | 7 | Cross-lab discovery and correctly routed requests |
| Advanced collaboration | 8 | Need-driven optional workflows |

Current progress:

- [x] Define the problem and single-lab-first scope.
- [x] Define loose, essential and project policies.
- [x] Establish incharge control over lab-specific rules.
- [x] Define complete lab inventory dashboard.
- [x] Document the phased rollout and expected outcomes.
- [x] Implement the technical foundation and CSV/Excel returnable-item import.
- [x] Receive VAuth client registration details; hosted login not yet verified.
- [ ] Align live authentication, unassigned onboarding and owner admin setup.
- [ ] Validate assumptions with the pilot lab.
- [ ] Implement and test the MVP.
- [ ] Run the pilot before multi-lab expansion.

## 12. Decisions to confirm during Phase 1

Confirmed: M201/Ajit Ghadge, hosted VAuth with local development callbacks,
name plus roll number in borrower records, separate due/actual return dates,
Essential/Project defaults, consumable exclusion, and deferred real-data intake.

Remaining inputs and decisions:

- Owner's exact verified account for first-admin setup and Ajit Ghadge's account for lab assignment; no identity is inferred from a display name.
- Actual hosted client acceptance, callback/proxy/cookie behavior, and deployment environment loading.
- Source and approval process for local borrower records and verified-email links; roll numbers alone are not identity proof.
- Exact item/unit classifications, outstanding records and physical reconciliation, deferred until data is available.
- Outside-lab borrowing permission, initial student-request versus direct-checkout flow, and partial/damaged/late-return handling.
- Pilot date, reminder channel/escalation owner, hosting and backup responsibility.
- Consumable recording method when Phase 5 begins: each issue, batch issue or count reconciliation.

These decisions refine implementation; they do not change the agreed goal: establish trustworthy single-lab stock and borrowing records, then expand to a shared catalogue while preserving each lab's control.


## 13. Technology stack and decisions

| Layer | Technology | Decision / responsibility |
|---|---|---|
| Language | TypeScript | Frontend, API, worker and shared contracts |
| Frontend | React + Vite | Selected; browser UI and build tooling |
| UI | Current React/CSS interface; shadcn/ui + Tailwind CSS planned | Import screen is implemented with plain CSS; component-system adoption remains future work |
| Authentication | Hosted VOSS VAuth + current `openid-client` adapter | Local callback alignment, live owner login and repeat identity preservation verified; onboarding/admin setup follows |
| Database | Neon PostgreSQL | Selected relational persistence |
| Database access | Drizzle ORM | Recommended and adopted in this plan for typed SQL-like queries/schema definitions |
| Schema migrations | Drizzle Kit | Reviewed, versioned SQL migrations committed with code |
| Backend runtime | Node.js | Implemented for API/worker foundation |
| API framework | Fastify | Implemented |
| Database driver | node-postgres (`pg`) with pooling | Implemented; supports interactive transactions; revisit only if moving to an edge runtime |
| Input validation | Zod | Implemented for runtime validation and API contracts |
| Routing / server state | React Router / TanStack Query | Proposed frontend utilities; add only where needed |
| Reminders | Scheduled TypeScript worker + persistent PostgreSQL jobs/outbox | Proposed initial design; scheduler/notification provider selected during Phase 1 |
| Testing | Vitest, React Testing Library and isolated PostgreSQL integration tests | Implemented; real-browser hosted login and repeat identity verified; logout and role-boundary acceptance follows |
| Hosting / images | To be selected | Separate app/worker deployment; object storage for photos if introduced |

No Next.js, separate microservices, Redis or message broker is required for the initial design. Choose compatible supported package releases at implementation time and pin them with a lockfile; this plan does not prescribe an unverified version.

### Why Drizzle is included

Neon stores the database; the driver connects to it; Drizzle provides typed query/schema tooling; Drizzle Kit manages schema changes. Drizzle is optional in principle, but helps contributors keep types and migrations consistent. It does not implement authorization, input validation, stock locking or loan rules automatically.

Use reviewed migrations for shared/live environments. Test changes and data backfills before deployment; avoid relying on manual console edits or unreviewed schema pushes.

### Authentication and authorization

The user-supplied VAuth `integrating.md`, reviewed on 17 October 2026, confirms
hosted OIDC authorization-code login with PKCE S256, verified college email,
optional name, and product-owned roles. VAuth does not run on the owner's
machine. Localhost refers to VInventory's development origin and callback.

| Setting | Agreed target |
|---|---|
| Hosted issuer | `https://accounts.vosslabs.org/api/auth` |
| Hosted discovery | `https://accounts.vosslabs.org/api/auth/.well-known/openid-configuration` |
| Local product origin | `http://localhost:5173` |
| Registered local callback | `http://localhost:5173/api/auth/oauth2/callback/voss` |
| Production product origin | `https://vinventory.vosslabs.org` |
| Registered production callback | `https://vinventory.vosslabs.org/api/auth/oauth2/callback/voss` |
| Requested scopes | `openid profile email` |

Use exact registered scheme, host, port and path, with no added trailing slash.
Do not substitute `127.0.0.1` for the browser-facing `localhost` callback. The
internal API proxy may still use `127.0.0.1:3000`; proxy `/api/auth/*` from the
product origin to the API. The registration output's localhost discovery URL
must be replaced by the hosted discovery URL. First-party status skips consent,
not application authorization. Registration is reported complete. Credentials
are stored only in the ignored local `.env`, never in this plan. Neon setup,
token exchange, local identity/session persistence and repeat login are verified.

**Adapter decision:** Retain the existing `openid-client`/Fastify adapter.
Protocol/configuration alignment is implemented; onboarding/access work follows.
The guide's Better Auth examples are a reference, not code already installed in
VInventory. The adapter decision and acceptance coverage are recorded in
`docs/authentication.md`; adopting Better Auth would require an explicit session/schema migration
plan and is not silently included here. Its `BETTER_AUTH_*` options do not configure
the existing adapter. Keep current product-session settings explicit; the guide's
seven-day sliding sessions are not implemented by the existing twelve-hour default.

Configuration now accepts `VOSS_CLIENT_ID`, `VOSS_CLIENT_SECRET` and hosted
`VOSS_DISCOVERY_URL`, retains compatible `VAUTH_*` aliases and rejects conflicting
values. Explicit discovery fetching is followed by an independent issuer check.
The registered callback path replaces `/auth/callback`; examples and startup
load the root `.env` from package commands. Vite keeps localhost:5173 fixed.
Secrets remain server-side, never in `VITE_*`, browser bundles or
tracked files. Use VInventory's own database, not VAuth's production database.

Validate token signature, issuer, audience, expiry, state and nonce; require a
verified email and a fallback display name. Keep `(provider, sub)` as the stable
login key. Link approved local records only through verified email, never name
or roll number, and refuse identity rebinding. Unmatched users get an explicit
access-pending destination and no operational role. Role checks use allowlists.
Product logout revokes the local session; remaining signed in at VAuth is normal
SSO behavior. Detailed implementation gaps and acceptance steps are in
`docs/authentication.md`.

### Application architecture

Browser React app calls the TypeScript API. The API validates identity, checks role/lab access, validates input and performs inventory operations through Drizzle and the PostgreSQL driver against Neon. Database credentials remain server-side. The worker uses the same domain rules and database, but runs independently of open browser sessions.

Use one modular backend with modules for identity integration, labs, catalogue, stock, loans, policies, notifications and reporting. Separate modules in code before considering separate services.

### Transaction correctness

At checkout, atomically claim an available unit or decrement available quantity conditionally, create the loan/line and movement, and enqueue relevant notification work. Reject insufficient stock. Use row locking or guarded updates and database constraints, not a read-then-write availability check alone. Repeated issue/return submissions require an idempotency key or equivalent duplicate-action protection.

Returns atomically record quantity/condition, reduce outstanding quantity and update usable/unavailable stock appropriately. Publish notification work only after committed changes. Preserve prior dates and policies in history.

### Reminder worker

Persist scheduled jobs with loan ID, due-date revision, reminder kind, scheduled time, attempt count and outcome. Use a unique logical job key and atomic job claiming. A scheduler invokes the worker periodically; do not rely solely on in-memory timers.

Immediately before sending, check that the loan is outstanding and the job matches its current due-date revision. On return, cancel pending jobs; on extension, invalidate and regenerate future jobs. Retry temporary failures with bounded backoff, log outcomes and use provider idempotency where available. Notify the responsible lab contact even if the original issuer is absent. Sending to external recipients occurs only in the deployed authorized workflow, not during planning.

### Suggested repository layout

- `apps/web`: React/Vite frontend.
- `apps/api`: TypeScript backend and domain modules.
- `apps/worker`: scheduled reminder entry point; may share deployment initially.
- `packages/db`: Drizzle schema, connection setup and migrations.
- `packages/contracts`: runtime validation and shared API types.
- `docs`: operating guide, contributing guide and architectural decisions.

Keep one repository and one application database initially. Separate environments, secrets, migration access and runtime permissions. Browser-visible Vite configuration must contain only public values.

## 14. Additional technical acceptance checks

- [x] VAuth contract reviewed against source and user-supplied integration guide; live verification remains separate.
- [x] Hosted VAuth works with the exact registered localhost callback and current client credentials.
- [ ] Production callback routing and environment configuration verified before deployment.
- [ ] Unmatched users remain unassigned; a typed roll number cannot claim another borrower's record.
- [ ] First-admin setup selects only the intended authenticated owner, is repeat-safe and records an audit event.
- [ ] Local identity switching requires explicit opt-in and cannot run or build enabled in production.
- [ ] Unauthenticated and unauthorized API calls rejected.
- [ ] Cross-lab access tested with different users.
- [ ] Runtime inputs validated, including quantities, units and dates.
- [ ] Simultaneous last-unit checkout permits only one successful loan.
- [ ] Repeated checkout/return submission cannot duplicate stock movements.
- [ ] Failed transactions leave no partially updated balances.
- [x] Initial migration applied to the separate Neon development database; verified 23 tables and one migration record.
- [ ] Reminder retries, duplicate jobs, closed loans and date changes tested.
- [ ] CSV exports respect role/lab access and handle spreadsheet formula input safely.
- [ ] Credentials absent from browser bundles and repository history.
- [ ] Backup/recovery procedure and contributor setup documented.

## 15. Refinement history and references

11 October 2026:

- Adopted VOSS's smaller lending-first delivery sequence.
- Preserved consumable exceptions, lab-specific policies and inventory structure from the original plan.
- Moved complete single-lab inventory to the next major milestone after pilot validation.
- Added notification reliability, contributor documentation and early access/recovery checks.
- Added selected stack and clearly labeled proposed backend/worker choices.
- Recorded pending VAuth verification rather than assuming unrelated authentication behavior.

15–17 October 2026:

- Confirmed M201 ownership, accepted lending presets, and register fields including roll number and separate due/actual return dates.
- Deferred actual item/loan collection and implemented CSV/Excel item import for later use; unverified imports remain unavailable for lending.
- Recorded supplied client registration as complete by user report, with configuration and hosted end-to-end verification still pending.
- Corrected the distinction between hosted VAuth discovery and local product callbacks; documented exact registered URLs.
- Added owner `system_admin` setup, explicit unassigned onboarding, verified-email record binding and isolated local role testing.
- Separated implemented code, planned auth alignment, technical readiness and operational pilot sign-off. Updated technology status to match the current code.

Technical references:

- VAuth `integrating.md`, supplied by the project owner and reviewed on 17 October 2026; key requirements recorded in `docs/authentication.md`.
- VOSS VAuth: https://github.com/voss-labs/vauth
- Drizzle overview: https://orm.drizzle.team/docs/overview
- Drizzle with Neon: https://orm.drizzle.team/docs/connect-neon
- Drizzle transactions: https://orm.drizzle.team/docs/transactions
- shadcn/ui with Vite: https://ui.shadcn.com/docs/installation/vite

Immediate next action: Implement unassigned onboarding and verified-email identity linking, followed by the owner's first-system-admin setup. Hosted localhost login and repeat identity preservation are verified against Neon. Verify logout and local role boundaries before relying on them for the lending MVP. Continue development with isolated test data while actual inventory/loan collection remains deferred; reconcile real records and obtain incharge sign-off before the live pilot.
