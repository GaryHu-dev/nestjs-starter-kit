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
