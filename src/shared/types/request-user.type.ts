import type { JwtPayload } from './jwt-payload.type';

/**
 * Authenticated request user.
 *
 * The user object attached to the HTTP request after
 * successful JWT authentication.
 */
export type RequestUser = JwtPayload;
