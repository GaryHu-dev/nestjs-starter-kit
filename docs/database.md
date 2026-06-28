# Database

The persistence layer is PostgreSQL accessed through TypeORM. The TypeORM
configuration lives in two places:

- `src/database/database.module.ts` — the runtime connection used by the app
  (`TypeOrmModule.forRootAsync`).
- `src/database/data-source.ts` — a standalone `DataSource` used by the TypeORM
  CLI for migrations.

Both use `SnakeNamingStrategy`, so camelCase entity fields map to `snake_case`
columns automatically (e.g. `firstName` -> `first_name`).

## Base entity

Every table extends `BaseEntity` (`src/database/entities/base.entity.ts`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key, generated |
| `created_at` | timestamptz | Set on insert |
| `updated_at` | timestamptz | Set on update |
| `deleted_at` | timestamptz, nullable | Soft-delete marker |

## Entities

| Table | Purpose | Key columns |
| --- | --- | --- |
| `users` | Core user profile | `email` (unique), `first_name`, `last_name`, `display_name`, `avatar_url`, `email_verified`, `status` |
| `identities` | Auth credentials per provider | `user_id` (FK), `provider`, `provider_user_id`, `password_hash`*, `refresh_token_hash`*, `expires_at`, `last_login_at` |
| `roles` | System or custom roles | `code` (unique), `name`, `description`, `is_system` |
| `permissions` | Permission definitions | `code` (unique), `name`, `description`, `is_system` |
| `user_roles` | User ↔ role assignments | `user_id` (FK), `role_id` (FK), `assigned_by`, `assigned_at`, `expires_at` |
| `role_permissions` | Role ↔ permission grants | `role_id` (FK), `permission_id` (FK), `assigned_by`, `assigned_at` |

\* `password_hash` and `refresh_token_hash` are declared `select: false` and are
never loaded unless explicitly requested.

### Relationships

- A **user** has many **identities** (one per auth provider). Unique index on
  `(provider, provider_user_id)`; deleting a user cascades to its identities.
- **Users** and **roles** form a many-to-many via `user_roles`
  (unique on `(user, role)`).
- **Roles** and **permissions** form a many-to-many via `role_permissions`
  (unique on `(role, permission)`).
- All relationship rows cascade on delete of their parent.

Separating credentials (`identities`) from the profile (`users`) lets a single
user link multiple providers and keeps secrets out of the profile table.

## Synchronize vs migrations

`synchronize` auto-derives schema from entities. It is convenient in
development but unsafe for production:

- Controlled by `DATABASE_SYNCHRONIZE` (default `false`).
- **Force-disabled when `NODE_ENV=production`** regardless of the flag
  (see `database.module.ts`).
- The CLI `data-source.ts` always sets `synchronize: false`.

Use migrations for any schema you intend to ship.

## Migrations workflow

Migrations live in `src/database/migrations/`. The CLI runs through ts-node in
development and against compiled JS in production.

| Command | When | What it does |
| --- | --- | --- |
| `pnpm migration:generate --name=<Name>` | Dev | Diff entities against the DB and generate a migration |
| `pnpm migration:create --name=<Name>` | Dev | Create an empty migration to hand-write |
| `pnpm migration:run` | Dev | Apply pending migrations (ts-node) |
| `pnpm migration:run:prod` | Production | Apply pending migrations (compiled `dist/`) |
| `pnpm migration:revert` | Dev | Roll back the most recent migration |
| `pnpm migration:show` | Dev | List applied/pending migrations |

The migrations history table is `migrations`. Generate against an
up-to-date database so the diff is accurate, and review generated SQL before
committing.

## Seeding

The seed (`src/database/seeds/seed.ts`) is **idempotent** and run with:

| Command | When |
| --- | --- |
| `pnpm seed` | Dev (ts-node) |
| `pnpm seed:prod` | Production (compiled `dist/`) |

It always:

1. Upserts the system roles `super-admin`, `admin`, `user` (`is_system = true`).
2. Upserts the wildcard permission `*` (`is_system = true`).
3. Grants the wildcard permission to `super-admin`.

If the following env vars are set, it also bootstraps the first super-admin user
and its local identity (password bcrypt-hashed). This is required because the
role-management endpoints are themselves RBAC-guarded — the first privileged
user cannot be created through the API.

| Variable | Required | Default |
| --- | --- | --- |
| `SEED_ADMIN_EMAIL` | To create admin | — |
| `SEED_ADMIN_PASSWORD` | To create admin | — |
| `SEED_ADMIN_FIRST_NAME` | No | `Super` |
| `SEED_ADMIN_LAST_NAME` | No | `Admin` |

If the email already exists, or the email/password pair is omitted, the user
step is skipped (roles and permissions are still seeded).

## Soft delete

`users` use soft deletion: `DELETE /api/v1/users/:id` calls TypeORM
`softDelete`, which sets `deleted_at` instead of removing the row. Default
queries exclude soft-deleted rows.
