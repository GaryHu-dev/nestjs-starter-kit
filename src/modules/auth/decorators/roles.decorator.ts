import { SetMetadata } from '@nestjs/common';
import { AUTH_METADATA } from '@/shared/constants';
import { RoleName } from '@/shared/enums';

/**
 * Restricts an endpoint to users holding at least one of the specified roles.
 *
 * Must be used in combination with RolesGuard.
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(AUTH_METADATA.ROLES, roles);
