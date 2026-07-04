# Troubleshooting

Common issues when running or developing the kit, and how to resolve them.

## Startup fails with a config validation error

The app validates all configuration at boot (Joi) and fails fast. The message
names the offending variable, e.g.:

```
Config validation error: "JWT_SECRET" length must be at least 32 characters long
```

Fixes:

- `JWT_SECRET` / `JWT_REFRESH_SECRET` must be ≥ 32 chars and different. Generate
  with `openssl rand -base64 48`.
- In **production** (`NODE_ENV=production`): `DATABASE_SSL` must be `true` and
  `BCRYPT_ROUNDS` must be ≥ 10 — the app refuses to start otherwise.
- Copy `.env.example` to `.env` and fill every required value.

## Cannot connect to the database

- Ensure PostgreSQL is running: `docker compose up -d`, then
  `docker compose ps`.
- Check `DATABASE_HOST/PORT/USER/PASSWORD/NAME` match your instance.
- Port `5432` already in use? Stop the other Postgres or change `DATABASE_PORT`
  (and the compose mapping).
- Connecting to managed Postgres and seeing a TLS error? Set `DATABASE_SSL=true`;
  for a self-signed chain also set `DATABASE_SSL_REJECT_UNAUTHORIZED=false`.

## `pnpm` version mismatch

The repo pins pnpm via `packageManager`. Run `corepack enable` once so the
pinned version is used automatically. If `pnpm install` complains about the
version, `corepack prepare pnpm@<version> --activate`.

## Migrations

- **`migration:generate` / `migration:run` appears to hang** — this tsconfig
  uses `nodenext`; the dev scripts already set `ts-node.transpileOnly`. To
  generate a baseline reliably, build first and run the compiled data source:
  `pnpm build` then
  `typeorm -d dist/database/data-source.js migration:generate ...`.
- **"relation already exists" / dirty schema** — you likely ran with
  `DATABASE_SYNCHRONIZE=true` previously. Migrations expect to own the schema;
  point them at a clean database (the CI job creates a dedicated one).
- **Production**: use `pnpm migration:run:prod` (compiled), never
  `synchronize` — it is force-disabled when `NODE_ENV=production`.

## E2E tests fail immediately

- They need a running Postgres on `localhost:5432` (user/pass `postgres`) — the
  same `docker compose up -d` instance works.
- E2E runs serially (`maxWorkers: 1`) because the suites share one database and
  truncate between tests. Don't parallelise them.
- Throttling is disabled under `NODE_ENV=test`, so rate limits won't interfere.

## 401 on a token that "should" work

Authorization is re-checked against the database every request. A `401` after a
previously-valid token usually means one of:

- The user **logged out** or **changed their password** (token version bumped —
  by design; get a new token).
- The account is no longer `ACTIVE` (suspended/soft-deleted).
- The token expired (default access-token lifetime is 15 minutes; use
  `POST /auth/refresh`).

## OAuth returns 401 / "Email not provided"

- The provider (Google/GitHub) is not configured — set its
  `*_CLIENT_ID/SECRET/CALLBACK_URL`. Strategies self-disable when unconfigured.
- GitHub accounts with only a private email may return no email; the login is
  rejected. Ask the user to make a primary email public or use email/password.

## Email verification link never arrives

By default `EMAIL_ENABLED=false` and the dev `LoggingEmailSender` writes the
message — including the verification link — to the application logs rather than
sending it. Wire a real provider by implementing `EmailSender` and rebinding it
in `EmailModule`.
