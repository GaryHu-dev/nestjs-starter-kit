import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { appConfig } from '@/config/app.config';
import { configureValidation } from '@/config/validation.config';
import { configureVersioning } from '@/config/versioning.config';

export interface TestApp {
  app: INestApplication<App>;
  dataSource: DataSource;
}

/**
 * Boots a fully-wired Nest application for e2e tests, applying the same
 * global prefix, versioning and validation pipeline as `main.ts` so the
 * tests exercise production-equivalent behaviour.
 *
 * Each spec file owns its own instance (created in `beforeAll`, closed in
 * `afterAll`), keeping suites independent.
 */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix(appConfig.apiPrefix);
  configureVersioning(app);
  configureValidation(app);

  await app.init();

  const dataSource = moduleRef.get<DataSource>(getDataSourceToken());
  return { app, dataSource };
}
