import { AuthProvider, PermissionName, RoleName } from '@/shared/enums';
import { AuthTokenType } from '@/shared/constants';

/**
 * JWT payload.
 *
 * Roles and permissions are embedded so that guards can
 * make authorization decisions without an extra DB round-trip.
 */
export type JwtPayload = {
  sub: string;
  email: string;
  provider: AuthProvider;
  type: AuthTokenType;
  roles?: RoleName[];
  permissions?: PermissionName[];
};
