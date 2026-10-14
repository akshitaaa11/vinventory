# Returnable-item file import

Real M201 inventory and outstanding-loan data collection is deferred. This
workflow lets authorized staff import item records when the data is ready.
It does not create borrower identities, loans, due dates, or return records.

## Use the import screen

1. Download the blank CSV template from the app. It can be edited in Excel and
   saved as CSV UTF-8 or `.xlsx`. The template is served by the frontend at
   `/inventory-template.csv`, so it is available even before the API is running.
2. Sign in with VAuth and select an active lab where you have `manage_stock`
   permission (incharges and system administrators have this permission).
3. Choose a file and select **Preview file**. Fix any reported row errors or
   existing stock-code/asset-tag conflicts, then preview the corrected file.
4. Select an existing active returnable-item policy for the batch and confirm
   the storage location. Use separate batches for different policies or storage.
5. Review the rows, check the confirmation box, and select **Import items**.

All rows are validated again on the server when importing. Changing a file or
lab clears the preview. A failed import saves no partial batch. Reimporting an
existing stock code is rejected rather than updating or doubling its quantity.

## File format

| Column | Requirement |
|---|---|
| Stock code | Required text, 1–80 characters; unique within the lab and file |
| Item/model name | Required text, 1–200 characters; include exact variants |
| Tracking | `individual` or `quantity` |
| Quantity | Whole number from 0 to 1,000,000 |
| Asset tags | For `individual`, one globally unique tag per unit, separated by semicolons; blank/optional for `quantity` |

Keep identifiers as text to preserve leading zeros. A new component-model
record is created for each imported stock row; names alone are not used to
guess whether models in different labs are identical. Stock uses unit of
measure `unit` and does not permit fractional quantities.

Limits: 2 MB per file, 500 item rows, 2,000 individually tracked units per
batch. CSV must be comma-separated UTF-8 (BOM and quoted fields are supported).
Excel must be an unprotected `.xlsx` file with one populated worksheet and
plain values, not formulas, hyperlinks, errors, or date cells. Save older
`.xls` files as `.xlsx`. Put headers in the first populated row; omit extra
columns. Excel archives are also checked against a 20 MB expanded-size limit.

## Inventory and audit behavior

Imported units and quantities begin in `awaiting_testing`, not `available`.
Physically reconcile the stock and check its condition before making it
available through the later verification workflow. Import does not create
physical-verification records or claim that the opening stock is verified.

One transaction creates component models, lab stock, quantity balances or
physical units, opening movements, and audit events identifying the importing
user, source filename, policy, storage location, and batch. Zero quantities
create stock records without a positive opening movement. Existing records
are never overwritten. File bytes are not stored on disk or in the database.

## Setup and endpoints

The database needs an active lab, the staff member's authorized lab membership,
and an active returnable borrowing policy. Configure these through the trusted
administration process; the importer does not grant permissions or create
policies. Live VAuth client registration is still required. A lab with no
eligible policy cannot commit imports.

The browser uses same-origin `/api` and `/auth` routes. Vite proxies both to
`http://127.0.0.1:3000` during development; open the app at
`http://127.0.0.1:5173` to match the example VAuth callback/cookie host.
Production must route these paths to the API behind the same origin as the web
app. Set `WEB_ORIGIN` to that browser origin. This screen does not use the old
`VITE_API_BASE_URL` setting. No new schema migration is needed for this feature.
The initial migration's existing policy index was moved before its dependent
foreign key so fresh database setup succeeds. This changes only statement
order, not the final schema; already-initialized databases need no change.

| Endpoint | Purpose |
|---|---|
| `GET /api/inventory/import-template.csv` | Blank template; no login required |
| `GET /api/import-labs` | Active labs the current user can manage |
| `GET /api/labs/:labId/import-policies` | Active returnable policies in the authorized lab |
| `POST /api/labs/:labId/inventory/import/preview` | Parse and validate without writing |
| `POST /api/labs/:labId/inventory/import` | Revalidate and commit atomically |

Upload requests are JSON with `filename` and base64 `content`. Commit also
requires `policyId`, `storageLocation`, and `confirmed: true`. Preview and
commit require a local authenticated session and lab stock permission.

## Verification

`pnpm verify` checks types, tests, and production builds. Tests cover CSV/Excel
parsing, validation and size limits, authenticated routes and lab permissions,
UI preview/confirmation/reset behavior, and database writes and rollback using
an isolated in-memory PostgreSQL engine. They do not use real pilot records or
demonstrate live VAuth registration.

Parser references: [ExcelJS](https://github.com/exceljs/exceljs),
[CSV Parse](https://csv.js.org/parse/api/sync/), and
[yauzl archive validation](https://github.com/thejoshwolfe/yauzl).
