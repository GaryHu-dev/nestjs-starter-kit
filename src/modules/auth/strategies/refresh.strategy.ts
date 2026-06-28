import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import * as bcrypt from 'bcrypt';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { AUTH_STRATEGY, AUTH_TOKEN_TYPE } from '@/shared/constants';
import type { JwtPayload } from '@/shared/types';
import { AuthRepository } from '../repositories/auth.repository';

/**
 * Passport strategy for refresh-token validation.
 *
 * Validates that the incoming JWT is a REFRESH token, then compares
 * its bcrypt hash against the value stored in the identity row to
 * prevent replay attacks after logout.
 */
@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, AUTH_STRATEGY.REFRESH) {
  constructor(
    config: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<JwtPayload> {
    if (payload.type !== AUTH_TOKEN_TYPE.REFRESH) {
      throw new UnauthorizedException('Invalid token type');
    }

    const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!rawToken) throw new UnauthorizedException();

    const identity = await this.authRepository.findIdentityWithHashByUserIdAndProvider(
      payload.sub,
      payload.provider,
    );

    if (!identity?.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const isValid = await bcrypt.compare(rawToken, identity.refreshTokenHash);
    if (!isValid) throw new UnauthorizedException('Refresh token mismatch');

    return payload;
  }
}
