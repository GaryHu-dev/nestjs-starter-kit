/**
 * Static application configuration.
 *
 * This file contains application-level constants that
 * remain consistent across all environments.
 *
 * Environment-specific values should be defined in `.env`
 * and accessed through the Config Module instead.
 */
export const appConfig = {
  name: 'NestJS Starter Kit',
  description: 'Enterprise NestJS Starter Kit',
  version: '1.0.0',
  apiPrefix: 'api',
  apiVersion: '1',
  swaggerPath: 'docs',
  swaggerSecurityScheme: 'JWT',
} as const;
