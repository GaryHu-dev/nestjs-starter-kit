import { QueryFailedError } from 'typeorm';
import { isUniqueViolation, PG_UNIQUE_VIOLATION } from './db.util';

describe('isUniqueViolation', () => {
  it('is true for a QueryFailedError with the unique-violation code', () => {
    const err = new QueryFailedError('query', [], new Error('dup') as never);
    (err as unknown as { code: string }).code = PG_UNIQUE_VIOLATION;
    expect(isUniqueViolation(err)).toBe(true);
  });

  it('is false for a QueryFailedError with a different code', () => {
    const err = new QueryFailedError('query', [], new Error('other') as never);
    (err as unknown as { code: string }).code = '23503';
    expect(isUniqueViolation(err)).toBe(false);
  });

  it('is false for a non-QueryFailedError', () => {
    expect(isUniqueViolation(new Error('boom'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation('nope')).toBe(false);
  });
});
