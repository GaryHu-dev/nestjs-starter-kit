import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { AUTH_METADATA, AUTH_STRATEGY } from '@/shared/constants';

/**
 * Global JWT authentication guard.
 *
 * Applied to every route via APP_GUARD. Endpoints decorated with
 * @Public() skip authentication entirely. All other routes require
 * a valid Bearer JWT in the Authorization header.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard(AUTH_STRATEGY.JWT) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(AUTH_METADATA.PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
