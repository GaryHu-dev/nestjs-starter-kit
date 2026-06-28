import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_METADATA } from '@/shared/constants';
import { PermissionName } from '@/shared/enums';
import type { RequestUser } from '@/shared/types';

/**
 * Global RBAC permissions guard.
 *
 * Applied via APP_GUARD after RolesGuard. Passes through when no
 * @Permissions() decorator is present. When permissions are required,
 * the authenticated user must hold at least one of the specified
 * permissions — or the wildcard PermissionName.ALL permission.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(AUTH_METADATA.PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<PermissionName[]>(
      AUTH_METADATA.PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    const user = request.user;

    if (!user?.permissions) return false;

    if (user.permissions.includes(PermissionName.ALL)) return true;

    return requiredPermissions.some((p) => user.permissions!.includes(p));
  }
}
