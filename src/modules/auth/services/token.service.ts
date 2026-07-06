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

  private get issuer(): string {
    return this.configService.getOrThrow<string>('jwt.issuer');
  }

  private get audience(): string {
    return this.configService.getOrThrow<string>('jwt.audience');
  }

  async signAccessToken(payload: Omit<JwtPayload, 'type'>): Promise<string> {
    return this.jwtService.signAsync(
      {
        ...payload,
        type: AUTH_TOKEN_TYPE.ACCESS,
      },
      {
        expiresIn: this.configService.getOrThrow<StringValue>('jwt.expiresIn'),
        issuer: this.issuer,
        audience: this.audience,
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
        issuer: this.issuer,
        audience: this.audience,
      },
    );
  }

  async verify<T extends JwtPayload>(token: string): Promise<T> {
    return this.jwtService.verifyAsync<T>(token, {
      issuer: this.issuer,
      audience: this.audience,
      algorithms: ['HS256'],
    });
  }

  decode<T extends JwtPayload>(token: string): T | null {
    const decoded: unknown = this.jwtService.decode(token);
    // `decode` returns `string | object | null`; only a payload object is a
    // valid JwtPayload, so anything else is normalised to null.
    return decoded !== null && typeof decoded === 'object' ? (decoded as T) : null;
  }
}
