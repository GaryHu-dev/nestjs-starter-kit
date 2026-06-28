import { SetMetadata } from '@nestjs/common';
import { AUTH_METADATA } from '@/shared/constants';
import { PermissionName } from '@/shared/enums';

/**
 * Restricts an endpoint to users holding at least one of the specified permissions.
 *
 * Must be used in combination with PermissionsGuard.
 */
export const Permissions = (...permissions: PermissionName[]) =>
  SetMetadata(AUTH_METADATA.PERMISSIONS, permissions);
