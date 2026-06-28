# Deployment

This guide covers building and running the app in production. The application
is a stateless HTTP service backed by PostgreSQL and ships as a Docker image.

## Docker image

The `Dockerfile` is a multi-stage build:

1. **deps** — installs production-only dependencies (`pnpm install --prod`).
2. **build** — installs all dependencies and runs `pnpm build`.
3. **production** — copies `node_modules` (prod) + `dist`, runs as the
   unprivileged `node` user, and uses `tini` as PID 1.

Notable properties:

- Base image `node:22-alpine`.
- Runs as **non-root** (`USER node`).
- **tini** init reaps zombies and forwards signals so graceful shutdown works.
- Built-in `HEALTHCHECK` polls `http://localhost:3000/api/v1/health` every 30s.
- Exposes port `3000`; entrypoint runs `node dist/main`.

Build and run:

```bash
docker build -t nestjs-starter:latest .
docker run --env-file .env -p 3000:3000 nestjs-starter:latest
```

## Local PostgreSQL

`docker-compose.yml` provisions a PostgreSQL 17 instance for local development
(it does not run the app itself). It reads `DATABASE_*` values from your `.env`
and persists data in the `postgres_data` volume:

```bash
docker compose up -d
```

## Required production environment

Validated at startup by the Joi schema; the app fails fast if anything is
missing or malformed.

| Variable | Notes |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Listen port (default 3000) |
| `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_USER` / `DATABASE_PASSWORD` / `DATABASE_NAME` | Connection details |
| `DATABASE_SSL` | `true` in production (TLS is enforced with `rejectUnauthorized: true`) |
| `JWT_SECRET` | Strong random string, **≥ 32 chars** |
| `JWT_REFRESH_SECRET` | Separate strong random string, **≥ 32 chars** |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | e.g. `15m` / `7d` |
| `FRONTEND_URL` | The single browser origin allowed by CORS (credentials enabled) |
| `SWAGGER_ENABLED` | `false` (Swagger is also force-disabled when `NODE_ENV=production`) |
| `GOOGLE_*` / `GITHUB_*` | Optional; required as a group if the provider's client id is set |

Generate secrets with e.g. `openssl rand -base64 48`.

## Deployment steps

1. **Build** the image (or your CI builds and pushes it to a registry).
2. **Run migrations** against the target database with the compiled CLI:
   ```bash
   pnpm migration:run:prod
   ```
3. **Seed** the first super-admin (one-time, with `SEED_ADMIN_EMAIL` /
   `SEED_ADMIN_PASSWORD` set):
   ```bash
   pnpm seed:prod
   ```
4. **Start** the container. The image runs `node dist/main`.

Run migrations and seeding as separate one-off jobs/init containers, not inside
the long-running app process.

## Production hardening

These are configured in code and apply automatically:

- **Graceful shutdown** — `app.enableShutdownHooks()` lets NestJS close DB
  connections and finish in-flight work on `SIGTERM`/`SIGINT`; tini ensures the
  signal reaches the process.
- **Trust proxy** — `trust proxy` is set to the first hop so rate limiting and
  logging see the real client IP behind a load balancer.
- **Security headers** — `helmet()` is applied globally; request bodies are
  capped at `1mb`.
- **CORS** — restricted to `FRONTEND_URL` with credentials enabled.
- **TLS to the database** — enforced in production.

## Health checks

Point your orchestrator's liveness/readiness probe and load balancer at:

```
GET /api/v1/health
```

It is public, exempt from rate limiting, and verifies database connectivity via
Terminus.
