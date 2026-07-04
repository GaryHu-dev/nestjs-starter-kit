# Security

This document describes the security controls built into the starter kit, the
threat model they address, and the operational responsibilities of anyone
running it in production. It is written with ANZ SME compliance expectations
(e.g. APRA CPS 234, the NZ/AU Privacy Acts) in mind.

## Authentication

- **Passwords** are hashed with bcrypt. The cost factor is configurable
  (`BCRYPT_ROUNDS`) and forced to a minimum of 10 in production by the config
  schema. Passwords are capped at bcrypt's 72-byte limit so no two passwords
  sharing a 72-byte prefix are ever treated as equal.
- **Access tokens** are short-lived JWTs (default 15 minutes) signed with
  `JWT_SECRET` and validated for `issuer`/`audience` on every request.
- **Refresh tokens** are separate JWTs signed with `JWT_REFRESH_SECRET`, and
  only their bcrypt hash is stored (in `identities.refresh_token_hash`,
  `select: false`). A stolen database row cannot be replayed as a refresh token.
- **OAuth** (Google/GitHub) logins are API-first (JSON, no HTML redirects) and
  self-disable when unconfigured.

## Authorization (RBAC)

Roles and permissions are resolved from the database on every request
(`JwtStrategy` → `AuthRepository.findAuthContext`), never trusted from the
token. Consequences:

- Granting or revoking a role/permission takes effect on the user's next
  request — no re-login, no waiting for token expiry.
- Guards match string codes, so roles and permissions created at runtime can
  gate endpoints.

The guard chain is `Throttler → JwtAuth → Roles → Permissions`. `@Public()`
opts a route out of authentication; `@Roles()` / `@Permissions()` add
authorization requirements. The `*` permission is a wildcard held by
super-admin.

## Token revocation

Each user has a monotonic `token_version`. Every token embeds the value it was
minted with, and `JwtStrategy` rejects a token whose version no longer matches.
The version is advanced on:

- **logout** (invalidates all of that user's access tokens, not just the
  refresh token),
- **password change**, and
- **OAuth takeover** of an unverified account.

Deactivating (or soft-deleting) a user is caught by the per-request status
check, which rejects any non-`ACTIVE` account immediately.

## Account protection

- **Per-account lockout:** after `LOGIN_MAX_ATTEMPTS` consecutive failures an
  identity is locked for `LOGIN_LOCKOUT_DURATION_MS`. Successful login resets
  the counter.
- **Rate limiting:** a global limit applies to every route; the
  credential-accepting auth endpoints add a stricter per-handler limit.
- **Enumeration resistance:** login returns a generic `Invalid credentials` for
  unknown, wrong-password, and locked accounts alike, and performs equivalent
  bcrypt work on the unknown/locked paths so response timing does not reveal
  whether an account exists. (A residual sub-millisecond delta remains — the
  wrong-password path additionally records the failed attempt — deliberately not
  masked with a dummy DB write, which would amplify attacker-driven load.) The
  verification-resend endpoint always returns `204` regardless of existence.

## OAuth account-linking (pre-hijack defence)

Linking an OAuth identity to an existing account by email is only safe when the
account has proven ownership of that email. Therefore:

- Linking by email requires the **provider** to report the email as verified
  (`profile.emailVerified`). An unverified provider email — e.g. an attacker's
  unverified GitHub secondary address set to the victim's email — is **never**
  linked to a pre-existing account; the login is rejected. (Google supplies
  `email_verified`; GitHub's library does not expose per-address verification,
  so GitHub emails are treated as unverified for linking — a brand-new account
  can still be created, but it won't take over an existing one.)
- Given a verified provider email: a verified pre-existing account is linked; an
  **unverified** pre-existing account is **taken over atomically** — in one
  transaction it purges every pre-existing identity (a pre-seeded local password
  AND any OAuth identity a squatter attached to the unverified address, since
  none were ever proven), marks the email verified, bumps the token version, and
  creates the now-verified provider's identity. Atomicity matters: a partial
  failure must never leave the account verified with a squatter's identity still
  attached. Note this **permanently removes** an unverified local password with
  no notification — the owner re-authenticates via OAuth (there is no
  password-reset flow out of the box; see below).
- OAuth logins that provide **no email** are rejected.

Emails are normalised (trimmed + lower-cased) on every entry point — register,
login, verification requests and OAuth — so case/whitespace variants cannot fork
a second account or side-step the per-account lockout. Normalisation is
case/whitespace only; Unicode-homoglyph and Gmail dot/plus-alias addresses are
treated as the distinct mailboxes they are at the SMTP layer.

## Email verification (informational, not a gate)

`POST /auth/verify-email/request` + `POST /auth/verify-email` verify an address
(stateless JWT scoped to a dedicated `email-verification` audience, so it can
never be replayed as an access token). **By design, `emailVerified` does not
gate API access** — an unverified user can still log in and use the API. This is
a deliberate SME default (the dev `EmailSender` only logs the link, so gating
would make local onboarding painful). To make verification a gate, check
`emailVerified` in `JwtStrategy.validate`/`assertActive` or add an
`@EmailVerified` guard on the routes that require it.

## HTTP hardening

- `helmet` security headers, a 1 MB request-body limit, and single-origin CORS
  restricted to `FRONTEND_URL`.
- `TRUST_PROXY` is configuration-driven and **must** match the deployment
  topology — over-trusting lets clients forge `X-Forwarded-For` to rotate the
  rate-limit key and poison the client IP in logs.
- Swagger is force-disabled in production regardless of the flag.
- Client-supplied `X-Request-ID` is validated against a strict allowlist before
  being echoed into logs/responses.

## Data protection

- Every response is built through an explicit DTO mapper (`Dto.from()`), so
  internal fields (`passwordHash`, `refreshTokenHash`, `deletedAt`,
  `tokenVersion`, provider IDs) can never leak through serialization.
- Logs redact `authorization`/`cookie` headers, `set-cookie`, and password /
  refresh-token fields.
- Database TLS is mandatory in production (`DATABASE_SSL=true`).

## Auditing

Security-relevant events (login success/failure, logout, password change, email
verification, role grant/revoke) are emitted as structured `audit: true` log
entries via `AuditService`. Route these to a tamper-evident sink (SIEM,
append-only store) in production; the emitter is transport-agnostic.

## Secrets & configuration

- All configuration is validated at startup (Joi); the app fails fast on a
  missing or invalid value.
- Generate strong secrets: `openssl rand -base64 48`. `JWT_SECRET` and
  `JWT_REFRESH_SECRET` must differ and be ≥ 32 characters.
- Never commit `.env`; `.dockerignore` and `.gitignore` exclude it.
- Rotate secrets by deploying new values; a `JWT_SECRET` rotation invalidates
  all existing tokens.

## Container & CI

- Multi-stage Docker build running as non-root (`USER node`) with `tini` as PID
  1 and a healthcheck.
- CI runs lint, build, unit + e2e tests, a clean-schema migration check, a
  production dependency audit (`pnpm audit`), CodeQL SAST, and a Trivy image
  scan.

## Known limitations / your responsibility

- **No password-reset flow** is shipped — add one using the same pluggable
  `EmailSender` seam as email verification.
- **Audit sink:** entries are logged but not persisted to a dedicated store out
  of the box — wire your log pipeline accordingly.
- **MFA** is not included.
- Run `pnpm audit` and keep dependencies patched; the CI job surfaces new
  advisories but cannot patch them for you.
