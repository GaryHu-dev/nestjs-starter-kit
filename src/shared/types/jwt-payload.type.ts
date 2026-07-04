import { AuthProvider } from '@/shared/enums';
import { AuthTokenType } from '@/shared/constants';

/**
 * JWT payload.
 *
 * Deliberately does NOT embed roles/permissions: authorization is resolved
 * from the database on every request (see JwtStrategy) so a role or permission
 * change takes effect immediately instead of waiting for the token to expire.
 *
 * `tv` carries the user's token version at mint time; JwtStrategy rejects the
 * token when it no longer matches the user's current tokenVersion, which is how
 * logout / password-change / OAuth-takeover revoke already-issued tokens.
 * (Deactivation is handled separately by the per-request account-status check.)
 */
export type JwtPayload = {
  sub: string;
  email: string;
  provider: AuthProvider;
  type: AuthTokenType;
  tv?: number;
};
