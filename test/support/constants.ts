import { appConfig } from '@/config/app.config';

/**
 * Base path for all versioned API routes, e.g. `/api/v1`.
 */
export const BASE = `/api/v${appConfig.apiVersion}`;

/**
 * Default password used when registering test users. Satisfies the
 * IsStrongPassword policy (upper, lower, digit, special, >= 8 chars).
 */
export const DEFAULT_PASSWORD = 'Password@123';

/**
 * A syntactically valid UUID v4 that is never persisted — use it to
 * exercise "not found" branches without tripping the UUID pipe.
 */
export const NON_EXISTENT_UUID = '11111111-1111-4111-8111-111111111111';
