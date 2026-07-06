import { envValidationSchema } from './env.validation';

const SECRET_A = 'a'.repeat(40);
const SECRET_B = 'b'.repeat(40);

const baseEnv = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  DATABASE_HOST: 'localhost',
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'postgres',
  DATABASE_NAME: 'app',
  JWT_SECRET: SECRET_A,
  JWT_REFRESH_SECRET: SECRET_B,
  FRONTEND_URL: 'http://localhost:3001',
  ...overrides,
});

describe('envValidationSchema', () => {
  it('accepts a valid configuration', () => {
    const { error } = envValidationSchema.validate(baseEnv());
    expect(error).toBeUndefined();
  });

  it('rejects a refresh secret equal to the access secret', () => {
    const { error } = envValidationSchema.validate(baseEnv({ JWT_REFRESH_SECRET: SECRET_A }));
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/JWT_REFRESH_SECRET/);
  });
});
