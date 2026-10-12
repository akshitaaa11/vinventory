# VInventory — Lab Inventory and Borrowing System Plan

Created: 8 October 2026

Refined: 12 October 2026

Status: Phase 1 technical foundation implemented; pilot-lab inputs, live VAuth registration, and incharge validation pending.

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

## 3. Categories and configurable policies

Categories are presets, not universal rules fixed by component name.

| Preset | Examples | Borrower required | Return required | Suggested duration |
|---|---|---|---|---|
| Loose / consumable | Resistors, capacitors, cut wire | No | No | Not applicable |
| Essential / short-term loan | Multimeter, soldering station, reusable battery | Yes | Yes | 3–4 days |
| Project / longer-term loan | Raspberry Pi 5, Jetson, FPGA board | Yes | Yes | More than one week; e.g. 14 days |

Durations are editable defaults. The agreed due date is set at issue. Battery treatment depends on whether it is reusable or expendable and on the lab's policy.

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
| Student | Browse permitted catalogue, request equipment, see own loans and request extensions |
| Lab incharge | Manage assigned lab stock and policies, approve requests, confirm issue/return, view borrowers and reports |
| Authorized lab staff | Delegated operations within assigned labs, according to permissions |
| System administrator | Manage accounts, lab onboarding and role assignment; privileged actions remain logged |

Students do not see other borrowers' personal details. Incharges manage only authorized labs. Inventory ownership and permissions must be enforced on the server, not merely hidden in the interface.

## 6. Core workflows

### A. Loose / consumable issue

1. Staff select component and quantity.
2. System validates available stock.
3. Staff confirm consumption; record time, staff and optional purpose.
4. Remaining stock decreases. No student identity, loan or due date is created.

Open bins may use batch consumption records and periodic counts. When withdrawals are not recorded individually, show the last verification date and treat displayed stock as an estimate between counts.

### B. Essential tool checkout

1. Student requests a tool, or staff start direct checkout at handover.
2. Staff verify student identity and availability.
3. Staff select actual units/quantity and agree a due date, using the 3–4 day default where configured.
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

**Goal:** Agree on the smallest useful release and preserve expansion options.

- [ ] Select one lab and its responsible incharge.
- [ ] Observe register-based issue/return activity and identify existing outstanding loans.
- [ ] Create a stable list of returnable models and unit IDs where needed.
- [ ] Agree essential/project presets, default durations and staff permissions.
- [ ] Confirm that loose consumables are outside the lending MVP and require no borrower or due date when introduced.
- [x] Review the actual VOSS VAuth repository and agree its supported integration contract.
- [x] Set up React/Vite frontend, TypeScript API, Neon and Drizzle schema/migrations.
- [x] Establish lab IDs, permissions, audit events and separate development/test/production configuration.

Technical foundation verified on 12 October 2026. The remaining unchecked
items require the pilot lab's actual register, inventory, staff identities, and
incharge approval; use `docs/phase-1-pilot-checklist.md` to capture them. A
live VAuth demonstration additionally requires VInventory client registration
by the VAuth administrator.

**Deliverables:** Agreed workflow, initial item records, schema and project skeleton.

**Outcome:** The team has a small achievable scope with durable lab ownership and item identities.

**Exit criteria:** Incharge accepts the workflow; VAuth login and server verification are demonstrated; no authentication protocol is assumed without repository review.

### Phase 2 — Returnable-equipment lending MVP

**Goal:** Replace the borrowing register with reliable digital possession records.

- [ ] Build staff checkout using an identified student, stable item reference, actual units/quantity and agreed due date.
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
| User and lab role | Student/staff identity and assigned permissions |
| Component model | Exact model, specifications, photo, searchable aliases |
| Lab stock | Lab, model, storage location, unit of measure, policy, tracking method |
| Physical unit | Unique ID, lab stock reference, condition/status |
| Inventory movement | Receipt, consumption, issue, return, adjustment; quantity, staff, time, reason |
| Request | Student, requested stock/quantity, purpose, dates, approval status |
| Loan and loan line | Borrower, issued units/quantities, due date, outstanding quantity, policy snapshot |
| Return record | Loan line, quantity/unit, condition, receiving staff/time |
| Extension record | Previous/proposed due date, reason and approval |
| Audit event | Actor, action, affected record and change history |

Consumption movements do not require a student reference. Returnable loans do. Confirmed stock-changing operations must be atomic and consistent.

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
- [ ] Validate assumptions with the pilot lab.
- [ ] Implement and test the MVP.
- [ ] Run the pilot before multi-lab expansion.

## 12. Decisions to confirm during Phase 1

Confirm these with the pilot incharge before implementing dependent features:

- Which lab and who can issue/receive equipment?
- Existing student identity source and login approach.
- Exact unit-versus-quantity classifications.
- Default durations and outside-lab borrowing permission.
- Whether students submit requests or staff use direct checkout initially.
- Consumable recording method: each issue, batch issue or count reconciliation.
- Reminder channel and escalation owner.
- Hosting, backup responsibility and operating procedure.

These decisions refine implementation; they do not change the agreed goal: establish trustworthy single-lab stock and borrowing records, then expand to a shared catalogue while preserving each lab's control.


## 13. Technology stack and decisions

| Layer | Technology | Decision / responsibility |
|---|---|---|
| Language | TypeScript | Frontend, API, worker and shared contracts |
| Frontend | React + Vite | Selected; browser UI and build tooling |
| UI | shadcn/ui + Tailwind CSS | Selected components, customized for forms/tables/dialogs |
| Authentication | VOSS VAuth: https://github.com/voss-labs/vauth | Selected identity provider; integration contract pending source review |
| Database | Neon PostgreSQL | Selected relational persistence |
| Database access | Drizzle ORM | Recommended and adopted in this plan for typed SQL-like queries/schema definitions |
| Schema migrations | Drizzle Kit | Reviewed, versioned SQL migrations committed with code |
| Backend runtime | Node.js | Proposed default for the TypeScript API/worker |
| API framework | Fastify | Proposed default; confirm with team before implementation |
| Database driver | node-postgres (`pg`) with pooling | Proposed for Node backend, supporting interactive transactions; revisit if deployed to an edge runtime |
| Input validation | Zod | Proposed for runtime validation and API contracts |
| Routing / server state | React Router / TanStack Query | Proposed frontend utilities; add only where needed |
| Reminders | Scheduled TypeScript worker + persistent PostgreSQL jobs/outbox | Proposed initial design; scheduler/notification provider selected during Phase 1 |
| Testing | Vitest + API/database integration tests; Playwright for critical user flows | Proposed validation tools |
| Hosting / images | To be selected | Separate app/worker deployment; object storage for photos if introduced |

No Next.js, separate microservices, Redis or message broker is required for the initial design. Choose compatible supported package releases at implementation time and pin them with a lockfile; this plan does not prescribe an unverified version.

### Why Drizzle is included

Neon stores the database; the driver connects to it; Drizzle provides typed query/schema tooling; Drizzle Kit manages schema changes. Drizzle is optional in principle, but helps contributors keep types and migrations consistent. It does not implement authorization, input validation, stock locking or loan rules automatically.

Use reviewed migrations for shared/live environments. Test changes and data backfills before deployment; avoid relying on manual console edits or unreviewed schema pushes.

### Authentication and authorization

The VAuth here is the VOSS repository, not the unrelated hosted service at v-auth.dev. Repository contents were not retrieved during planning, so no OAuth/OIDC, JWT, SDK or role feature is asserted.

Before implementation, verify supported login flow, server-side credential/session validation, stable user identity, expiry/logout behavior and deployment requirements. Store its stable identity mapping to a local application user; keep lab membership and permissions in VInventory. Do not write directly into VAuth's internal tables or share database credentials unless an explicitly documented integration requires it.

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

- [ ] VAuth integration verified against the actual VOSS source/docs.
- [ ] Unauthenticated and unauthorized API calls rejected.
- [ ] Cross-lab access tested with different users.
- [ ] Runtime inputs validated, including quantities, units and dates.
- [ ] Simultaneous last-unit checkout permits only one successful loan.
- [ ] Repeated checkout/return submission cannot duplicate stock movements.
- [ ] Failed transactions leave no partially updated balances.
- [ ] Migrations tested on a separate database before live deployment.
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

Technical references:

- VOSS VAuth: https://github.com/voss-labs/vauth
- Drizzle overview: https://orm.drizzle.team/docs/overview
- Drizzle with Neon: https://orm.drizzle.team/docs/connect-neon
- Drizzle transactions: https://orm.drizzle.team/docs/transactions
- shadcn/ui with Vite: https://ui.shadcn.com/docs/installation/vite

Immediate next action: Confirm Phase 1 workflow with the pilot incharge and review VAuth's actual integration contract, then implement the lending MVP.
