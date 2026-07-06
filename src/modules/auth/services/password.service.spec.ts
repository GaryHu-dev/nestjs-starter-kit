import { ConfigService } from '@nestjs/config';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    // Keep rounds low so the suite stays fast; the production floor is enforced
    // by the Joi schema, not this service.
    const config = { get: jest.fn().mockReturnValue(4) } as unknown as ConfigService;
    service = new PasswordService(config);
  });

  describe('hash', () => {
    it('returns a bcrypt hash string', async () => {
      const hash = await service.hash('Password@123');
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    });

    it('produces a different hash each call (salt)', async () => {
      const h1 = await service.hash('Password@123');
      const h2 = await service.hash('Password@123');
      expect(h1).not.toBe(h2);
    });
  });

  it('falls back to a default cost when config is unset', () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    expect(new PasswordService(config)).toBeDefined();
  });

  describe('compare', () => {
    it('returns true for matching password and hash', async () => {
      const hash = await service.hash('Password@123');
      const result = await service.compare('Password@123', hash);
      expect(result).toBe(true);
    });

    it('returns false for wrong password', async () => {
      const hash = await service.hash('Password@123');
      const result = await service.compare('WrongPassword@1', hash);
      expect(result).toBe(false);
    });
  });

  describe('token hashing', () => {
    it('round-trips a long token', async () => {
      const token = 'a'.repeat(200);
      const hash = await service.hashToken(token);
      expect(await service.compareToken(token, hash)).toBe(true);
    });

    it('distinguishes tokens that share a 72-byte prefix (no bcrypt truncation)', async () => {
      // bcrypt silently truncates its input at 72 bytes. Refresh tokens are JWTs
      // whose first 72 bytes (header + start of a fixed-order payload) are
      // identical for a given user, so hashing the raw token would let a stale
      // token pass verification against a rotated one. Pre-digesting with SHA-256
      // must fold the whole token into the hash.
      const sharedPrefix = 'x'.repeat(80);
      const tokenA = `${sharedPrefix}.AAAA`;
      const tokenB = `${sharedPrefix}.BBBB`;
      const hash = await service.hashToken(tokenA);

      expect(await service.compareToken(tokenA, hash)).toBe(true);
      expect(await service.compareToken(tokenB, hash)).toBe(false);
    });
  });
});
