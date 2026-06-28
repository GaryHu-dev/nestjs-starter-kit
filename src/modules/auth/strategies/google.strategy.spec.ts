import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { AuthProvider } from '@/shared/enums';
import type { Profile } from 'passport-google-oauth20';

const makeConfig = (clientId = '', clientSecret = '', callbackUrl = '') =>
  ({
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'oauth.google.clientId') return clientId;
      if (key === 'oauth.google.clientSecret') return clientSecret;
      if (key === 'oauth.google.callbackUrl') return callbackUrl;
      return undefined;
    }),
  }) as unknown as ConfigService;

const makeProfile = (): Profile =>
  ({
    id: 'google-123',
    emails: [{ value: 'gary@example.com', verified: 'true' }],
    name: { givenName: 'Gary', familyName: 'Hu' },
    photos: [{ value: 'https://example.com/photo.jpg' }],
    provider: 'google',
    displayName: 'Gary Hu',
    _raw: '',
    _json: {} as Profile['_json'],
  }) as unknown as Profile;

describe('GoogleStrategy', () => {
  describe('when OAuth is disabled (no credentials)', () => {
    let strategy: GoogleStrategy;

    beforeEach(() => {
      strategy = new GoogleStrategy(makeConfig());
    });

    it('throws UnauthorizedException on validate', () => {
      expect(() => strategy.validate('at', 'rt', makeProfile())).toThrow(UnauthorizedException);
    });
  });

  describe('when OAuth credentials are null from config', () => {
    it('treats null config values as disabled', () => {
      const configWithNull = { get: jest.fn().mockReturnValue(null) } as unknown as ConfigService;
      const strategy = new GoogleStrategy(configWithNull);
      expect(() => strategy.validate('at', 'rt', makeProfile())).toThrow(UnauthorizedException);
    });
  });

  describe('when OAuth is enabled', () => {
    let strategy: GoogleStrategy;

    beforeEach(() => {
      strategy = new GoogleStrategy(
        makeConfig('client-id', 'client-secret', 'http://localhost:3000/callback'),
      );
    });

    it('returns an OAuthProfile with correct fields', () => {
      const profile = strategy.validate('at', 'rt', makeProfile());
      expect(profile.provider).toBe(AuthProvider.GOOGLE);
      expect(profile.providerUserId).toBe('google-123');
      expect(profile.email).toBe('gary@example.com');
      expect(profile.firstName).toBe('Gary');
      expect(profile.lastName).toBe('Hu');
      expect(profile.avatarUrl).toBe('https://example.com/photo.jpg');
    });

    it('returns empty strings for missing profile fields', () => {
      const sparse = {
        id: 'gid',
        emails: [],
        name: {},
        photos: [],
        provider: 'google',
        displayName: '',
        _raw: '',
        _json: {},
      } as unknown as Profile;

      const result = strategy.validate('at', 'rt', sparse);
      expect(result.email).toBe('');
      expect(result.firstName).toBe('');
      expect(result.avatarUrl).toBeNull();
    });
  });
});
