import { SetMetadata } from '@nestjs/common';
import { AUTH_METADATA } from '@/shared/constants';
import { RoleName } from '@/shared/enums';

/**
 * Restricts an endpoint to users holding at least one of the specified roles.
 *
 * Accepts role codes as strings so roles created at runtime can gate endpoints
 * too; the RoleName enum just provides well-known codes. Requires RolesGuard.
 */
export const Roles = (...roles: (RoleName | string)[]) => SetMetadata(AUTH_METADATA.ROLES, roles);
