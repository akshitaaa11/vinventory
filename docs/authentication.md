# VAuth integration contract

Status: reviewed against the official VAuth repository and implemented in the
API foundation.

## Boundary

VAuth is the identity provider. VInventory owns application sessions,
`student`/`staff`/`system_admin` account types, lab memberships, and every
lab-scoped permission. VAuth roles are deliberately not used for inventory
authorization.

VInventory stores the stable OIDC `sub` claim as `users.auth_subject`, together
with the provider key `vauth`. Email and display name are profile attributes,
not identity keys. No password, VAuth session, or VAuth database table is
copied into this application.

## Supported protocol

- OIDC discovery from the configured issuer. The hosted issuer documented by
  VAuth is `https://accounts.vosslabs.org/api/auth`.
- Authorization Code flow with mandatory PKCE S256.
- `state` and `nonce` generated for every attempt and validated at callback.
- Requested scopes: `openid profile email`.
- Client authentication: `client_secret_post`.
- ID-token signature and claims validated by `openid-client` against the
  discovered issuer metadata and JWKS.
- Exact registered callback URI from `VAUTH_REDIRECT_URI`.

The short-lived login transaction is kept in a signed, HTTP-only, SameSite=Lax
cookie. A successful callback upserts the local identity and creates a random
opaque VInventory session. Only the token hash is persisted. Production
cookies are Secure; production VAuth issuers must use HTTPS.

## Routes

| Route | Purpose |
|---|---|
| `GET /auth/login?returnTo=/path` | Start OIDC login; only local return paths are accepted |
| `GET /auth/callback` | Verify the callback, create the local session, redirect to the web app |
| `POST /auth/logout` | Revoke the local session and clear its cookie |
| `GET /api/me` | Demonstrate authenticated local identity |
| `GET /api/labs/:labId/issue-access` | Demonstrate server-side lab permission enforcement |

## Registration still required outside this repository

The official VAuth repository does not currently ship a VInventory client.
Before a live demonstration, its administrator must register:

- the VInventory client ID and secret;
- every exact development and production callback URI;
- the web origins allowed by that deployment, if VAuth requires them.

Put the issued values in the target environment's secret store. Do not commit
them. The automated API tests use a fake OIDC boundary to verify transaction
cookies, callback handling, local session creation, safe redirects, and
lab-scoped authorization without impersonating a real VAuth deployment.
