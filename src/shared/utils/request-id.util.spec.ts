import { resolveRequestId } from './request-id.util';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('resolveRequestId', () => {
  it('accepts a well-formed client id', () => {
    expect(resolveRequestId('abc-123_ID.9')).toBe('abc-123_ID.9');
  });

  it('takes the first value when given an array', () => {
    expect(resolveRequestId(['good-id', 'other'])).toBe('good-id');
  });

  it('replaces a missing id with a UUID', () => {
    expect(resolveRequestId(undefined)).toMatch(UUID);
  });

  it('rejects ids with unsafe characters (injection defence)', () => {
    expect(resolveRequestId('bad id with spaces')).toMatch(UUID);
    expect(resolveRequestId('inject\nnewline')).toMatch(UUID);
    expect(resolveRequestId('')).toMatch(UUID);
  });

  it('rejects an over-long id', () => {
    expect(resolveRequestId('a'.repeat(129))).toMatch(UUID);
  });
});
