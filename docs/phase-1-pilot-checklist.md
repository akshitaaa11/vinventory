# Phase 1 pilot decision and intake checklist

This is the sign-off record for decisions that require the real pilot lab and
cannot be inferred safely from source code. Complete it with the responsible
incharge before loading production-like data.

Pilot details and acceptance of the existing presets and permission model were
provided by the project owner on 15 October 2026. Formal incharge sign-off,
inventory/loan reconciliation, and full role-boundary verification remain pending.

Updated 17 October 2026: the owner supplied successful VInventory client
registration output and the VAuth integration guide. Hosted VAuth now serves
the local product: callback/configuration alignment, separate Neon migrations,
owner login, `/api/me` and repeat identity preservation are verified. Unassigned
onboarding, first-admin setup, logout and full access-boundary testing remain. See
[authentication plan](./authentication.md).

**Deferred on 15 October 2026:** The project owner does not yet have the real
item and loan data. Collection and reconciliation are postponed so development
can continue. These steps are not complete and remain required before the live
pilot. Returnable-item records can be loaded later through the CSV/Excel import
workflow; see [inventory import](./inventory-import.md).

## 1. Pilot ownership

| Decision | Confirmed value |
|---|---|
| Lab name | M201 VLSI Lab |
| Stable lab code | M201; never reuse for another lab |
| Location | 201 M-block VIT |
| Responsible incharge name | Ajit Ghadge |
| Responsible incharge VAuth account | _Required_ |
| Pilot start date | _Required_ |
| Staff who may operate checkout/return | Ajit Ghadge |
| Intended first system administrator | Project owner; exact authenticated account to be selected during trusted setup |

## 2. Observe the current register

The observed register records borrower name, borrower's roll number, borrowed
unit/model name, issued date, return date, purpose, and verifier. On 15 October 2026, the project owner
confirmed that "Return date" is the actual date returned and requested a
separate "Due date". The agreed pilot register format is:

| Borrower's name | Borrower's roll number | Borrowed unit/model name | Issued date | Due date | Return date (actual) | Purpose | Verified by |
|---|---|---|---|---|---|---|---|
| _Actual records pending_ | | | | | | | |

Record the borrower's roll number as text, preserving leading zeros and any
letters. Retain both the name and roll number when reconciling existing loans.

Due date is the agreed deadline recorded at issue. Return date records an
actual return and remains blank until a return occurs. Partial returns must
retain their returned units/quantities and actual return dates separately;
the remaining balance stays outstanding.

The register structure is recorded; workflow details and outstanding records
are still pending. Record how staff identify the borrower and item,
who approves, how the due date is agreed, and how partial, damaged, or late
returns are handled. List every outstanding loan that must be carried into
the pilot below, retaining its purpose from the source register.

| Existing register reference | Borrower's name | Borrower's roll number | Model/unit | Issued date | Due date | Return date (actual) | Purpose | Current status | Verified by |
|---|---|---|---|---|---|---|---|---|---|
| _Add rows_ | | | | | | | | | |

Reconcile each row against physical custody. Ambiguous records are entered as
exceptions, not silently guessed. For existing loans without a recorded due
date, agree one with the incharge before pilot import; do not derive it from
the actual return date.

## 3. Stable returnable-item list

The agreed intake columns are below. Actual item rows and quantities have
not yet been supplied; collection is deferred. Use a separate row for exact variants, including the
variant in the item/model name where needed.

| Stock code | Item/model name | Tracking (`individual`/`quantity`) | Quantity |
|---|---|---|---|
| _Add rows_ | | | |

For individually tracked items, also record one stable asset tag per physical
unit before pilot import; a quantity alone does not identify the units.
In the import file, add an `Asset tags` column containing semicolon-separated
tags for each individually tracked row. Leave it empty for quantity tracking.

| Stock code | Asset tag | Verified by |
|---|---|---|
| _Add rows for individually tracked units_ | | |

Asset tags should use one documented format, for example
`M201-<STOCK-CODE>-<SEQUENCE>`. Existing durable tags may be retained if they
are unique and stable. Confirm quantities and record who verified them before
treating them as opening stock.

## 4. Presets and permissions

The application enforces these invariants: every returnable issue has an
identified borrower and due date; a consumable issue has neither a loan nor a
due date. The project owner accepted the existing pilot defaults on
15 October 2026.

| Preset | Initial recommendation | Confirmed value |
|---|---|---|
| Essential | Returnable; approval required; 4 days; extensions allowed | Accepted unchanged |
| Project | Returnable; approval and project purpose required; 14 days; extensions allowed | Accepted unchanged |
| Loose/consumable | Excluded from lending MVP; later consumption has no borrower/due date | Accepted unchanged |

The existing permission model is accepted unchanged. Ajit Ghadge will hold
the incharge role for M201, with the permissions below. Linking this role to
the actual VAuth account remains pending.

| Staff name | Staff VAuth account | Manage stock | Manage policies | Approve | Issue | Receive | Export | Confirmation |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Ajit Ghadge | _Required_ | Yes | Yes | Yes | Yes | Yes | Yes | Project owner accepted existing incharge permissions; formal sign-off pending |

## 5. Authentication and administration readiness

- [x] VInventory client registration reported complete; credentials and guide supplied by the owner.
- [x] Use hosted discovery at `https://accounts.vosslabs.org/api/auth/.well-known/openid-configuration`; metadata fetched successfully.
- [x] Implement and configure the exact registered local callback `http://localhost:5173/api/auth/oauth2/callback/voss`.
- [x] Align supplied `VOSS_*` settings with the current adapter, root `.env` loading and examples; credentials remain server-side.
- [x] Configure the selected separate Neon `neondb` development database and apply migrations; verified 23 tables and one migration record.
- [ ] Replace automatic `student` assignment with explicit unassigned onboarding and role allowlists.
- [x] Owner can sign in through hosted VAuth from local VInventory and reach `GET /api/me`.
- [ ] Bootstrap only the owner's selected authenticated identity as `system_admin`, with an audited, repeat-safe command.
- [ ] Provision development M201 and accepted policies for owner-led testing; keep synthetic records separate from real pilot data.
- [x] The same identity maps to one local user on repeat login.
- [ ] Unassigned users have no operational access; ordinary users without the required lab permission receive `403` (system admins deliberately have global access).
- [ ] Authorized staff receives access only for the assigned pilot lab.
- [ ] Borrower links use verified email and stable subject; a typed roll number cannot claim a record.
- [x] Header sign-out revokes the local session and returns to the public landing page.
- [ ] Independent role tests use isolated fixtures; any local identity switcher requires explicit opt-in and is rejected in production runtime/builds.
- [ ] Verify production routing for `https://vinventory.vosslabs.org/api/auth/oauth2/callback/voss` before deployment.

## 6. Sign-off

Phase 1's operational exit is met only when the incharge confirms the workflow,
the stable item list and outstanding loans are reconciled, and the real VAuth
demonstration above passes.

Technical readiness can enable Phase 2 development while collection is deferred.
It does not complete this operational sign-off. First-admin setup/testing can be
performed by the owner without requiring Ajit Ghadge to participate; his actual
account and acceptance are still needed before the lab starts using the product.

| Signatory | Name | Date | Decision/notes |
|---|---|---|---|
| Lab incharge | Ajit Ghadge | | Pending formal sign-off |
| Implementation owner | _Required_ | | |
