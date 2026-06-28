/**
 * TypeORM DataSource used by the TypeORM CLI.
 *
 * This configuration is independent from NestJS and is used
 * for migrations and database management commands.
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as orm from '@/database/orm';

const isProduction = process.env.NODE_ENV === 'production';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: false,
  logging: !isProduction,
  namingStrategy: new SnakeNamingStrategy(),
  entities: Object.values(orm),
  migrations: [isProduction ? 'dist/database/migrations/*.js' : 'src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  ssl: isProduction ? { rejectUnauthorized: true } : false,
});
