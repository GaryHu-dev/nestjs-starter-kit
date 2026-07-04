import type { JwtPayload } from './jwt-payload.type';

/**
 * Authenticated request user.
 *
 * Attached to the HTTP request after successful JWT authentication. Roles and
 * permissions are string codes loaded fresh from the database by JwtStrategy on
 * every request (not read from the token), so they always reflect current
 * grants — including roles/permissions created at runtime.
 */
export type RequestUser = JwtPayload & {
  roles: string[];
  permissions: string[];
};
