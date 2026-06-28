import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GithubStrategy } from './github.strategy';
import { AuthProvider } from '@/shared/enums';
import type { Profile } from 'passport-github2';

const makeConfig = (clientId = '', clientSecret = '', callbackUrl = '') =>
  ({
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'oauth.github.clientId') return clientId;
      if (key === 'oauth.github.clientSecret') return clientSecret;
      if (key === 'oauth.github.callbackUrl') return callbackUrl;
      return undefined;
    }),
  }) as unknown as ConfigService;

const makeProfile = (): Profile =>
  ({
    id: 'gh-456',
    username: 'garyhu',
    displayName: 'Gary Hu',
    emails: [{ value: 'gary@example.com' }],
    photos: [{ value: 'https://avatars.github.com/u/1' }],
    provider: 'github',
    _raw: '',
    _json: {},
  }) as unknown as Profile;

describe('GithubStrategy', () => {
  describe('when OAuth is disabled', () => {
    it('throws UnauthorizedException on validate', () => {
      const strategy = new GithubStrategy(makeConfig());
      expect(() => strategy.validate('at', 'rt', makeProfile())).toThrow(UnauthorizedException);
    });
  });

  describe('when OAuth is enabled', () => {
    let strategy: GithubStrategy;

    beforeEach(() => {
      strategy = new GithubStrategy(
        makeConfig('client-id', 'client-secret', 'http://localhost:3000/callback'),
      );
    });

    it('returns a correct OAuthProfile', () => {
      const result = strategy.validate('at', 'rt', makeProfile());
      expect(result.provider).toBe(AuthProvider.GITHUB);
      expect(result.providerUserId).toBe('gh-456');
      expect(result.email).toBe('gary@example.com');
      expect(result.firstName).toBe('Gary');
      expect(result.lastName).toBe('Hu');
      expect(result.avatarUrl).toBe('https://avatars.github.com/u/1');
    });

    it('handles sparse profile with no displayName or photos', () => {
      const sparse = {
        id: 'gid',
        username: 'garyhu',
        displayName: 'garyhu',
        emails: [{ value: 'gary@example.com' }],
        photos: [],
        provider: 'github',
        _raw: '',
        _json: {},
      } as unknown as Profile;

      const result = strategy.validate('at', 'rt', sparse);
      expect(result.firstName).toBe('garyhu');
      expect(result.lastName).toBe('');
      expect(result.avatarUrl).toBeNull();
    });

    it('falls back to username when displayName is null/undefined', () => {
      const sparse = {
        id: 'gid2',
        username: 'fallback-user',
        displayName: null,
        emails: [],
        photos: [],
        provider: 'github',
        _raw: '',
        _json: {},
      } as unknown as Profile;

      const result = strategy.validate('at', 'rt', sparse);
      expect(result.firstName).toBe('fallback-user');
      expect(result.email).toBe('');
    });
  });

  describe('when OAuth credentials are null from config', () => {
    it('treats null config values as disabled', () => {
      const configWithNull = {
        get: jest.fn().mockReturnValue(null),
      } as unknown as ConfigService;
      const strategy = new GithubStrategy(configWithNull);
      expect(() => strategy.validate('at', 'rt', makeProfile())).toThrow(UnauthorizedException);
    });
  });
});
