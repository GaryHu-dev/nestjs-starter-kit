import { validate } from 'class-validator';
import { IsStrongPassword } from './is-strong-password.validator';

class TestDto {
  @IsStrongPassword()
  password!: string;
}

async function validatePassword(value: string): Promise<string[]> {
  const dto = new TestDto();
  dto.password = value;
  const errors = await validate(dto);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('IsStrongPassword', () => {
  it('accepts a valid strong password', async () => {
    const errors = await validatePassword('Password@123');
    expect(errors).toHaveLength(0);
  });

  it('rejects a password without uppercase', async () => {
    const errors = await validatePassword('password@123');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a password without lowercase', async () => {
    const errors = await validatePassword('PASSWORD@123');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a password without digit', async () => {
    const errors = await validatePassword('Password@abc');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a password without special character', async () => {
    const errors = await validatePassword('Password123');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a password shorter than 8 characters', async () => {
    const errors = await validatePassword('Pa1@');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects non-string values', async () => {
    const dto = new TestDto();
    (dto as unknown as Record<string, unknown>).password = 42;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('includes a helpful default message', async () => {
    const errors = await validatePassword('weak');
    expect(errors.join(' ')).toContain('uppercase');
  });
});
