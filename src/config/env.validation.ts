/**
 * Environment variable validation.
 *
 * Fail fast during application startup if any
 * required configuration is missing or invalid.
 */
import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),

  PORT: Joi.number().port().default(3000),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_LOGGING: Joi.boolean().default(false),
  DATABASE_SYNCHRONIZE: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+\s*(ms|s|m|h|d|w|y)$/)
    .default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .pattern(/^\d+\s*(ms|s|m|h|d|w|y)$/)
    .default('7d'),

  FRONTEND_URL: Joi.string().uri().required(),

  SWAGGER_ENABLED: Joi.boolean().default(true),

  // OAuth providers are optional. When a provider's client id is supplied, its
  // secret and callback URL become required so misconfiguration fails at startup.
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_SECRET: Joi.string()
    .allow('')
    .when('GOOGLE_CLIENT_ID', {
      is: Joi.string().min(1).required(),
      then: Joi.string().min(1).required(),
    }),
  GOOGLE_CALLBACK_URL: Joi.string()
    .uri()
    .allow('')
    .when('GOOGLE_CLIENT_ID', {
      is: Joi.string().min(1).required(),
      then: Joi.string().uri().required(),
    }),

  GITHUB_CLIENT_ID: Joi.string().allow('').optional(),
  GITHUB_CLIENT_SECRET: Joi.string()
    .allow('')
    .when('GITHUB_CLIENT_ID', {
      is: Joi.string().min(1).required(),
      then: Joi.string().min(1).required(),
    }),
  GITHUB_CALLBACK_URL: Joi.string()
    .uri()
    .allow('')
    .when('GITHUB_CLIENT_ID', {
      is: Joi.string().min(1).required(),
      then: Joi.string().uri().required(),
    }),
});
