/**
 * Shared PostgreSQL connection options.
 *
 * Both the NestJS `TypeOrmModule` (runtime) and the standalone `DataSource`
 * used by the TypeORM CLI (migrations) are built from this single factory so
 * connection settings — TLS, pool size, timeouts, naming strategy — can never
 * drift apart between the two.
 */
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export interface DatabaseConnectionInput {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  sslRejectUnauthorized: boolean;
  logging: boolean;
  poolMax: number;
  statementTimeoutMs: number;
  lockTimeoutMs: number;
}

/**
 * The connection-level options shared by every consumer. Callers add the bits
 * that legitimately differ (entities/migrations, `synchronize`, retry policy).
 */
export function buildPostgresBaseOptions(input: DatabaseConnectionInput) {
  return {
    type: 'postgres' as const,
    host: input.host,
    port: input.port,
    username: input.username,
    password: input.password,
    database: input.database,
    logging: input.logging,
    namingStrategy: new SnakeNamingStrategy(),
    maxQueryExecutionTime: 1000,
    ssl: input.ssl ? { rejectUnauthorized: input.sslRejectUnauthorized } : false,
    extra: {
      max: input.poolMax,
      statement_timeout: input.statementTimeoutMs,
      lock_timeout: input.lockTimeoutMs,
    },
  };
}

/**
 * Read a boolean-ish env var with a default.
 */
export function envBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true';
}

/**
 * Read a numeric env var with a default.
 */
export function envNum(value: string | undefined, fallback: number): number {
  return value === undefined || value === '' ? fallback : Number(value);
}
