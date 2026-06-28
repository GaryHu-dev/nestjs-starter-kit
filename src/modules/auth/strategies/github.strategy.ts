import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import { AUTH_STRATEGY } from '@/shared/constants';
import { AuthProvider } from '@/shared/enums';
import type { OAuthProfile } from '../types/oauth-profile.type';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, AUTH_STRATEGY.GITHUB) {
  private readonly enabled: boolean;
  private readonly logger = new Logger(GithubStrategy.name);

  constructor(config: ConfigService) {
    const clientID = config.get<string>('oauth.github.clientId') ?? '';
    const clientSecret = config.get<string>('oauth.github.clientSecret') ?? '';
    const callbackURL = config.get<string>('oauth.github.callbackUrl') ?? '';

    super({
      clientID: clientID || 'DISABLED',
      clientSecret: clientSecret || 'DISABLED',
      callbackURL: callbackURL || 'http://localhost:3000/disabled',
      scope: ['user:email'],
    });

    this.enabled = Boolean(clientID && clientSecret && callbackURL);
    if (!this.enabled) {
      this.logger.warn(
        'GitHub OAuth is disabled — GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET / GITHUB_CALLBACK_URL are not configured',
      );
    }
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): OAuthProfile {
    if (!this.enabled) {
      throw new UnauthorizedException('GitHub OAuth is not configured on this server');
    }

    const email = profile.emails?.[0]?.value ?? '';
    const displayName = profile.displayName ?? profile.username ?? '';
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] ?? displayName;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    const avatarUrl = profile.photos?.[0]?.value ?? null;

    return {
      provider: AuthProvider.GITHUB,
      providerUserId: profile.id,
      email,
      firstName,
      lastName,
      avatarUrl,
    };
  }
}
