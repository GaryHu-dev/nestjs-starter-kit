/**
 * Cache TTL values in seconds.
 */
export const CACHE_TTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  FIFTEEN_MINUTES: 900,
  ONE_HOUR: 3_600,
  ONE_DAY: 86_400,
} as const;

export type CacheTtl = (typeof CACHE_TTL)[keyof typeof CACHE_TTL];

/**
 * Cache key prefixes for namespacing stored values.
 */
export const CACHE_KEY = {
  USER: 'user',
  ROLE: 'role',
  PERMISSION: 'permission',
  SESSION: 'session',
} as const;

export type CacheKey = (typeof CACHE_KEY)[keyof typeof CACHE_KEY];
