import './setup-env';
import { DataSource } from 'typeorm';

/**
 * Jest globalSetup — runs once, before any e2e spec.
 *
 * Creates the dedicated test database if it does not already exist. Table
 * creation is handled by TypeORM `synchronize` when the application boots
 * inside each spec. Runs in its own process, hence the explicit env import.
 */
export default async function globalSetup(): Promise<void> {
  const databaseName = process.env.DATABASE_NAME ?? 'nestjs_starter_test';

  const root = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    database: 'postgres',
  });

  await root.initialize();
  try {
    await root.query(`CREATE DATABASE "${databaseName}"`);
  } catch {
    // Database already exists — safe to ignore.
  } finally {
    await root.destroy();
  }
}
