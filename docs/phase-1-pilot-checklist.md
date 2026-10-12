# Phase 1 pilot decision and intake checklist

This is the sign-off record for decisions that require the real pilot lab and
cannot be inferred safely from source code. Complete it with the responsible
incharge before loading production-like data.

## 1. Pilot ownership

| Decision | Confirmed value |
|---|---|
| Lab name | _Required_ |
| Stable lab code | _Required; short and never reused_ |
| Location | _Required_ |
| Responsible incharge name and VAuth account | _Required_ |
| Pilot start date | _Required_ |
| Staff who may operate checkout/return | _Required_ |

## 2. Observe the current register

Observe at least one representative issue and return period. Record how staff
identify the borrower and item, who approves, how the due date is agreed, and
how partial, damaged, or late returns are handled. List every outstanding loan
that must be carried into the pilot.

| Existing register reference | Borrower | Model/unit | Issued | Due | Current status | Verified by |
|---|---|---|---|---|---|---|
| _Add rows_ | | | | | | |

Reconcile each row against physical custody. Ambiguous records are entered as
exceptions, not silently guessed.

## 3. Stable returnable-item list

Use a separate row for exact variants. Assign an asset tag to every
individually tracked board/tool before pilot import.

| Stock code | Manufacturer/model | Exact variant | Tracking (`individual`/`quantity`) | Unit of measure | Storage | Asset tags or opening quantity | Verified by |
|---|---|---|---|---|---|---|---|
| _Add rows_ | | | | | | | |

Asset tags should use one documented format, for example
`<LAB-CODE>-<STOCK-CODE>-<SEQUENCE>`. Existing durable tags may be retained if
they are unique and stable.

## 4. Presets and permissions

The application enforces these invariants: every returnable issue has an
identified borrower and due date; a consumable issue has neither a loan nor a
due date. Confirm the editable pilot defaults below.

| Preset | Initial recommendation | Confirmed value |
|---|---|---|
| Essential | Returnable; approval required; 4 days; extensions allowed | _Required_ |
| Project | Returnable; approval and project purpose required; 14 days; extensions allowed | _Required_ |
| Loose/consumable | Excluded from lending MVP; later consumption has no borrower/due date | _Confirm_ |

| Staff VAuth account | Manage stock | Manage policies | Approve | Issue | Receive | Export | Approved by |
|---|---:|---:|---:|---:|---:|---:|---|
| _Add rows_ | | | | | | | |

## 5. VAuth live demonstration

- [ ] VInventory client registered by the VAuth administrator.
- [ ] Development callback exactly matches `VAUTH_REDIRECT_URI`.
- [ ] Test user can sign in through VAuth and reach `GET /api/me`.
- [ ] The same identity maps to one local user on repeat login.
- [ ] A user without lab membership receives `403` on the lab access probe.
- [ ] Authorized staff receives access only for the assigned pilot lab.
- [ ] Logout revokes the local session.

## 6. Sign-off

Phase 1's operational exit is met only when the incharge confirms the workflow,
the stable item list and outstanding loans are reconciled, and the real VAuth
demonstration above passes.

| Signatory | Name | Date | Decision/notes |
|---|---|---|---|
| Lab incharge | _Required_ | | |
| Implementation owner | _Required_ | | |
