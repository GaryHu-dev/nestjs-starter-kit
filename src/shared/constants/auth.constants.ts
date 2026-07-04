/**
 * Authentication strategy names.
 */
export const AUTH_STRATEGY = {
  JWT: 'jwt',
  REFRESH: 'jwt-refresh',
  GOOGLE: 'google',
  GITHUB: 'github',
} as const;

export type AuthStrategy = (typeof AUTH_STRATEGY)[keyof typeof AUTH_STRATEGY];

/**
 * JWT token types.
 */
export const AUTH_TOKEN_TYPE = {
  ACCESS: 'access',
  REFRESH: 'refresh',
} as const;

export type AuthTokenType = (typeof AUTH_TOKEN_TYPE)[keyof typeof AUTH_TOKEN_TYPE];

/**
 * Authentication metadata keys.
 */
export const AUTH_METADATA = {
  PUBLIC: 'isPublic',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
} as const;

export type AuthMetadataKey = (typeof AUTH_METADATA)[keyof typeof AUTH_METADATA];

/**
 * Maximum password length.
 *
 * bcrypt only hashes the first 72 bytes of its input and silently ignores the
 * rest; capping here makes that boundary explicit so two passwords that share a
 * 72-byte prefix can never be treated as equal.
 */
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Stricter per-handler rate limit applied to the sensitive auth endpoints
 * (login, register, refresh, and both verify-email routes) via @Throttle, on
 * top of the per-account lockout. Static because @Throttle is evaluated at
 * decoration time and cannot read runtime config.
 */
export const AUTH_RATE_LIMIT = { ttl: 60_000, limit: 10 } as const;

/**
 * Audience claim for email-verification tokens. Distinct from the API audience
 * so a verification token can never be replayed as an access token (JwtStrategy
 * validates the API audience and rejects it) and vice versa.
 */
export const EMAIL_VERIFICATION_AUDIENCE = 'email-verification';
