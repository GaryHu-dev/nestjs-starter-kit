# 3. Database-resolved (dynamic) RBAC over token-embedded roles

**Status:** Accepted (supersedes the v1.0 static approach)

## Context

v1.0 embedded a user's roles/permissions in the access token and matched them
against compile-time enums in the guards. This had two flaws: roles/permissions
created through the API could never gate an endpoint, and a role change did not
take effect until the token expired (~15 min).

## Decision

Resolve authorization from the database on every request. `JwtStrategy` loads
the user's current status, `tokenVersion` and role/permission **codes** via
`AuthRepository.findAuthContext` and attaches them to `request.user`. Guards
match string codes; the enums remain only as well-known seed constants.

## Consequences

- Grants/revocations take effect on the next request — no re-login.
- Runtime-created roles/permissions can gate endpoints.
- The role/permission CRUD surface and the `user → role` endpoints are now
  meaningful.
- Cost: one authorization read per authenticated request. Acceptable at SME
  scale; add a short-TTL cache keyed by user id if it ever becomes hot.
- Tokens no longer carry roles/permissions — a breaking change for anything
  that parsed the access token (clients should treat it as opaque).
