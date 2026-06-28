import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AUTH_STRATEGY } from '@/shared/constants';

/**
 * Guard that validates a refresh JWT.
 *
 * Applied only to the token refresh endpoint. The route should be
 * marked @Public() to bypass the global JwtAuthGuard, then
 * this guard takes over to validate the refresh-specific JWT.
 */
@Injectable()
export class RefreshGuard extends AuthGuard(AUTH_STRATEGY.REFRESH) {}
