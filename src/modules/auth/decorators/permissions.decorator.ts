import { SetMetadata } from '@nestjs/common';
import { AUTH_METADATA } from '@/shared/constants';
import { PermissionName } from '@/shared/enums';

/**
 * Restricts an endpoint to users holding at least one of the specified permissions.
 *
 * Accepts permission codes as strings so permissions created at runtime can
 * gate endpoints too; the PermissionName enum just provides well-known codes.
 * Requires PermissionsGuard.
 */
export const Permissions = (...permissions: (PermissionName | string)[]) =>
  SetMetadata(AUTH_METADATA.PERMISSIONS, permissions);
