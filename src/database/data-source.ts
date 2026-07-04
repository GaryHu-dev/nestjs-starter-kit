/**
 * TypeORM DataSource used by the TypeORM CLI.
 *
 * This configuration is independent from NestJS and is used
 * for migrations and database management commands.
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as orm from '@/database/orm';
import { buildPostgresBaseOptions, envBool, envNum } from './data-source-options';

const isProduction = process.env.NODE_ENV === 'production';

export default new DataSource({
  ...buildPostgresBaseOptions({
    host: process.env.DATABASE_HOST!,
    port: envNum(process.env.DATABASE_PORT, 5432),
    username: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!,
    ssl: envBool(process.env.DATABASE_SSL, false),
    sslRejectUnauthorized: envBool(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED, true),
    logging: !isProduction,
    poolMax: envNum(process.env.DATABASE_POOL_MAX, 10),
    statementTimeoutMs: envNum(process.env.DATABASE_STATEMENT_TIMEOUT_MS, 30000),
    lockTimeoutMs: envNum(process.env.DATABASE_LOCK_TIMEOUT_MS, 10000),
  }),
  synchronize: false,
  entities: Object.values(orm),
  migrations: [isProduction ? 'dist/database/migrations/*.js' : 'src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
});
