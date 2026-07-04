import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_TOKEN_TYPE } from '@/shared/constants';
import { UserStatus } from '@/shared/enums';
import type { JwtPayload, RequestUser } from '@/shared/types';
import { AuthRepository } from '../repositories/auth.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
      issuer: config.getOrThrow<string>('jwt.issuer'),
      audience: config.getOrThrow<string>('jwt.audience'),
    });
  }

  /**
   * Re-validate the token against live database state on every request:
   * the user must still exist and be ACTIVE, and the token's version must match
   * the user's current tokenVersion (so logout/password-change/deactivation
   * revoke it). Roles and permissions are loaded fresh here rather than trusted
   * from the token, which is what makes runtime RBAC changes take effect at once.
   */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    // Defence-in-depth: only an ACCESS token may authenticate a request, so a
    // refresh or (same-secret) email-verification token can never be replayed
    // here even if audience validation were ever misconfigured.
    if (payload.type !== AUTH_TOKEN_TYPE.ACCESS) {
      throw new UnauthorizedException('Invalid token type');
    }

    const context = await this.authRepository.findAuthContext(payload.sub);
    if (!context) throw new UnauthorizedException('User no longer exists');

    if (context.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${context.status}`);
    }

    if ((payload.tv ?? 0) !== context.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      ...payload,
      roles: context.roles,
      permissions: context.permissions,
    };
  }
}
