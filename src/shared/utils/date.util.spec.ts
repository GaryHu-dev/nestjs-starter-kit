import { nowIso, addSeconds, isPast } from './date.util';

describe('date.util', () => {
  describe('nowIso', () => {
    it('returns a valid ISO 8601 string', () => {
      const result = nowIso();
      expect(new Date(result).toISOString()).toBe(result);
    });

    it('returns a timestamp close to the current time', () => {
      const before = Date.now();
      const result = nowIso();
      const after = Date.now();
      const ts = new Date(result).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe('addSeconds', () => {
    it('adds seconds to a date', () => {
      const base = new Date('2024-01-01T00:00:00.000Z');
      const result = addSeconds(base, 60);
      expect(result.getTime()).toBe(base.getTime() + 60_000);
    });

    it('handles negative seconds (subtracts)', () => {
      const base = new Date('2024-01-01T01:00:00.000Z');
      const result = addSeconds(base, -3600);
      expect(result.getTime()).toBe(base.getTime() - 3_600_000);
    });

    it('returns a new Date object, not mutating the input', () => {
      const base = new Date('2024-01-01T00:00:00.000Z');
      const original = base.getTime();
      addSeconds(base, 100);
      expect(base.getTime()).toBe(original);
    });
  });

  describe('isPast', () => {
    it('returns true for a date in the past', () => {
      const past = new Date(Date.now() - 10_000);
      expect(isPast(past)).toBe(true);
    });

    it('returns false for a date in the future', () => {
      const future = new Date(Date.now() + 10_000);
      expect(isPast(future)).toBe(false);
    });
  });
});
