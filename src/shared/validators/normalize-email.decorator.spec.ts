import { plainToInstance } from 'class-transformer';
import { NormalizeEmail } from './normalize-email.decorator';

class SampleDto {
  @NormalizeEmail()
  email!: unknown;
}

describe('NormalizeEmail', () => {
  it('trims and lower-cases a string email', () => {
    const dto = plainToInstance(SampleDto, { email: '  Gary@Example.COM ' });
    expect(dto.email).toBe('gary@example.com');
  });

  it('passes non-string values through unchanged', () => {
    expect(plainToInstance(SampleDto, { email: 123 }).email).toBe(123);
    expect(plainToInstance(SampleDto, { email: undefined }).email).toBeUndefined();
  });
});
