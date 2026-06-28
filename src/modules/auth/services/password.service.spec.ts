import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
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
});
