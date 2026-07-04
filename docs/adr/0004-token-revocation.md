# 4. Token-version revocation for stateless JWTs

**Status:** Accepted

## Context

Stateless JWTs cannot be revoked before they expire. v1.0 could only revoke the
refresh token, so a stolen or post-logout access token stayed valid for up to
its lifetime. A revocation mechanism was needed without forcing a session store
(the kit must run out of the box on Postgres alone, no Redis).

## Decision

Give each user a monotonic `token_version` column. Every token embeds the value
it was minted with (`tv` claim); `JwtStrategy` rejects any token whose `tv` no
longer matches the user's current version. The version is bumped on logout,
password change, and OAuth account takeover.

## Consequences

- Logout/password-change revoke all outstanding access tokens on the next
  request, using only Postgres.
- Combined with the per-request status check, deactivation is also immediate.
- Cost: the value is read as part of the per-request authorization load (ADR 3),
  so revocation adds no extra query.
- A Redis-backed `jti` denylist can replace this later for multi-region scale;
  the check is isolated to `JwtStrategy`.
