import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AUTH_STRATEGY } from '@/shared/constants';
import { AuthProvider } from '@/shared/enums';
import type { OAuthProfile } from '../types/oauth-profile.type';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, AUTH_STRATEGY.GOOGLE) {
  private readonly enabled: boolean;
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(config: ConfigService) {
    const clientID = config.get<string>('oauth.google.clientId') ?? '';
    const clientSecret = config.get<string>('oauth.google.clientSecret') ?? '';
    const callbackURL = config.get<string>('oauth.google.callbackUrl') ?? '';

    super({
      clientID: clientID || 'DISABLED',
      clientSecret: clientSecret || 'DISABLED',
      callbackURL: callbackURL || 'http://localhost:3000/disabled',
      scope: ['email', 'profile'],
    });

    this.enabled = Boolean(clientID && clientSecret && callbackURL);
    if (!this.enabled) {
      this.logger.warn(
        'Google OAuth is disabled — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL are not configured',
      );
    }
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): OAuthProfile {
    if (!this.enabled) {
      throw new UnauthorizedException('Google OAuth is not configured on this server');
    }

    const email = profile.emails?.[0]?.value;
    const avatarUrl = profile.photos?.[0]?.value ?? null;

    return {
      provider: AuthProvider.GOOGLE,
      providerUserId: profile.id,
      email: email ?? '',
      firstName: profile.name?.givenName ?? '',
      lastName: profile.name?.familyName ?? '',
      avatarUrl,
    };
  }
}
