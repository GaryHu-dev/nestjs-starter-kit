import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { AUTH_TOKEN_TYPE } from '@/shared/constants';
import { JwtPayload } from '@/shared/types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signAccessToken(payload: Omit<JwtPayload, 'type'>): Promise<string> {
    return this.jwtService.signAsync(
      {
        ...payload,
        type: AUTH_TOKEN_TYPE.ACCESS,
      },
      {
        expiresIn: this.configService.getOrThrow<StringValue>('jwt.expiresIn'),
      },
    );
  }

  async signRefreshToken(payload: Omit<JwtPayload, 'type'>): Promise<string> {
    return this.jwtService.signAsync(
      {
        ...payload,
        type: AUTH_TOKEN_TYPE.REFRESH,
      },
      {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.getOrThrow<StringValue>('jwt.refreshExpiresIn'),
      },
    );
  }

  async verify<T extends JwtPayload>(token: string): Promise<T> {
    return this.jwtService.verifyAsync<T>(token);
  }

  decode<T extends JwtPayload>(token: string): T | null {
    return this.jwtService.decode(token);
  }
}
