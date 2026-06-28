/**
 * Environment configuration for the e2e test process.
 *
 * Registered via `setupFiles` in jest-e2e.json so these variables are set
 * before any application module (and its ConfigModule validation) is
 * imported by a spec file. Values that a CI environment may legitimately
 * override use `??=`; operational flags are forced.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_NAME ??= 'nestjs_starter_test';
process.env.DATABASE_SYNCHRONIZE = 'true';
process.env.BCRYPT_ROUNDS = '1';
process.env.JWT_SECRET ??= 'test_jwt_secret_that_is_at_least_32_chars_long';
process.env.JWT_REFRESH_SECRET ??= 'test_jwt_refresh_secret_that_is_32_chars_long';
process.env.JWT_EXPIRES_IN ??= '15m';
process.env.JWT_REFRESH_EXPIRES_IN ??= '7d';
process.env.FRONTEND_URL ??= 'http://localhost:3001';
process.env.SWAGGER_ENABLED = 'false';
