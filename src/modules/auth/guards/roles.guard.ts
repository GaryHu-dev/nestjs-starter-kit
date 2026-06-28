import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_METADATA } from '@/shared/constants';
import { RoleName } from '@/shared/enums';
import type { RequestUser } from '@/shared/types';

/**
 * Global RBAC roles guard.
 *
 * Applied via APP_GUARD after JwtAuthGuard. Passes through when no
 * @Roles() decorator is present. When roles are required, the
 * authenticated user must hold at least one of the specified roles.
 *
 * Role membership is resolved from request.user.roles which is
 * populated by JwtStrategy after JWT validation.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(AUTH_METADATA.PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(AUTH_METADATA.ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    const user = request.user;

    if (!user?.roles) return false;

    return requiredRoles.some((role) => user.roles!.includes(role));
  }
}
