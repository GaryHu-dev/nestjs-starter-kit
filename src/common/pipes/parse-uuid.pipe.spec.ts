import { BadRequestException } from '@nestjs/common';
import { ParseUuidPipe } from './parse-uuid.pipe';

describe('ParseUuidPipe', () => {
  let pipe: ParseUuidPipe;

  beforeEach(() => {
    pipe = new ParseUuidPipe();
  });

  it('returns the value unchanged for a valid UUID v4', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(pipe.transform(uuid)).toBe(uuid);
  });

  it('throws BadRequestException for a non-UUID string', () => {
    expect(() => pipe.transform('not-a-uuid')).toThrow(BadRequestException);
  });

  it('throws for an empty string', () => {
    expect(() => pipe.transform('')).toThrow(BadRequestException);
  });

  it('throws for a UUID with wrong version (v1)', () => {
    expect(() => pipe.transform('550e8400-e29b-11d4-a716-446655440000')).toThrow(
      BadRequestException,
    );
  });

  it('includes the invalid value in the error message', () => {
    try {
      pipe.transform('bad-value');
    } catch (e) {
      expect((e as BadRequestException).message).toContain('bad-value');
    }
  });
});
