# API Reference

All routes are served under the global prefix `api` with URI version `1`, so
the base path is:

```
/api/v1
```

Authenticated routes require an `Authorization: Bearer <access_token>` header.
Some routes additionally require a role (enforced by `RolesGuard`).

## Response envelope

Every successful response is wrapped:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {},
  "meta": { "traceId": "<uuid>", "timestamp": "<iso-8601>" }
}
```

Errors use the same envelope:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "data": null,
  "meta": { "traceId": "<uuid>", "timestamp": "<iso-8601>" }
}
```

`message` may be a string or an array of strings (e.g. validation errors).

## Conventions

- **Pagination** — list endpoints that paginate accept `page` (default 1) and
  `pageSize` (default 20, max 100) query params and return a `Paginated<T>`
  payload: `{ items, pagination: { page, pageSize, total, totalPages } }`.
- **IDs** — all resource ids are UUIDs (validated by `ParseUuidPipe`).
- **Rate limiting** — 120 requests/minute per client by default (health check
  is exempt). Exceeding it returns `429 Too Many Requests`.
- **Swagger** — interactive docs at `/docs`. Enabled via `SWAGGER_ENABLED` and
  **force-disabled in production**.

## Auth

Base path `/api/v1/auth`.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Register a local account. Body: `firstName`, `lastName`, `email`, `password`. Returns access + refresh tokens and user profile. |
| POST | `/auth/login` | Public | Login with `email` + `password`. Returns access + refresh tokens and profile. |
| POST | `/auth/logout` | Bearer | Invalidate the current session (clears the stored refresh-token hash). `204 No Content`. |
| POST | `/auth/refresh` | Refresh token | Issue a new access/refresh token pair. Send the refresh token as the Bearer token; validated by `RefreshGuard`. |
| GET | `/auth/me` | Bearer | Return the authenticated user's profile. |
| POST | `/auth/change-password` | Bearer | Change the local account password. Body: `currentPassword`, `newPassword`. `204 No Content`. |
| GET | `/auth/google` | Public | Start the Google OAuth flow (redirects to Google). |
| GET | `/auth/google/callback` | Public | Google OAuth callback. Returns tokens + profile. |
| GET | `/auth/github` | Public | Start the GitHub OAuth flow (redirects to GitHub). |
| GET | `/auth/github/callback` | Public | GitHub OAuth callback. Returns tokens + profile. |

Passwords must be at least 8 characters with an uppercase letter, a lowercase
letter, a digit, and a special character. OAuth providers are active only when
their client id/secret are configured (see `.env.example`).

## Users

Base path `/api/v1/users`. All routes require a Bearer token.

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/users` | `admin`, `super-admin` | List users. Query: `page`, `pageSize`. Returns paginated `UserDto`. |
| GET | `/users/:id` | `admin`, `super-admin` | Get a user by id. |
| PUT | `/users/:id` | `admin`, `super-admin` | Update profile. Body: `firstName?`, `lastName?`, `displayName?`, `avatarUrl?`. |
| DELETE | `/users/:id` | `super-admin` | Soft-delete a user. `204 No Content`. You cannot delete your own account. |

## Identities

Base path `/api/v1/identities`. Requires a Bearer token.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/identities/me` | Bearer | List the linked authentication providers (local/google/github) for the current user. |

## Roles

Base path `/api/v1/roles`. The entire controller is restricted to `super-admin`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/roles` | List all roles. |
| GET | `/roles/:id` | Get a role by id. |
| POST | `/roles` | Create a role. Body: `code`, `name`, `description?`. |
| PUT | `/roles/:id` | Update a role. Body: `name?`, `description?` (`code` is immutable). |
| DELETE | `/roles/:id` | Delete a role. `204 No Content`. |
| POST | `/roles/:id/permissions` | Assign a permission. Body: `permissionId` (UUID). `204 No Content`. |
| DELETE | `/roles/:id/permissions/:permissionId` | Remove a permission from the role. `204 No Content`. |
| GET | `/roles/:id/permissions` | List the permission codes assigned to the role. |

System roles (`super-admin`, `admin`, `user`) cannot be modified or deleted.
`isSystem` cannot be set by clients.

## Permissions

Base path `/api/v1/permissions`. The entire controller is restricted to
`super-admin`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/permissions` | List all permissions. |
| GET | `/permissions/:id` | Get a permission by id. |
| POST | `/permissions` | Create a permission. Body: `code`, `name`, `description?`. |
| PUT | `/permissions/:id` | Update a permission. Body: `name?`, `description?` (`code` is immutable). |
| DELETE | `/permissions/:id` | Delete a permission. `204 No Content`. |

System permissions (the wildcard `*`) cannot be modified or deleted, and
`isSystem` cannot be set by clients.

## Health

Base path `/api/v1/health`.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | Liveness + dependency check. Verifies the database via Terminus (`pingCheck`). Exempt from rate limiting. |

Suitable as a readiness/liveness probe for orchestrators and load balancers.
