import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from '@/app.module';
import { appConfig } from '@/config/app.config';
import { configureCors } from '@/config/cors.config';
import { configureSecurity } from '@/config/security.config';
import { configureSwagger } from '@/config/swagger.config';
import { configureValidation } from '@/config/validation.config';
import { configureVersioning } from '@/config/versioning.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // Disable Nest's default body parser so the explicit, size-limited parsers
    // registered in configureSecurity (1 MB) are the only ones — otherwise the
    // default 100 KB parser runs first and silently wins.
    bodyParser: false,
  });
  app.useLogger(app.get(Logger));
  const config = app.get(ConfigService);

  app.setGlobalPrefix(appConfig.apiPrefix);

  configureSecurity(app, config.getOrThrow<boolean | number | string>('security.trustProxy'));
  configureCors(app);
  configureVersioning(app);
  configureValidation(app);

  // Never publish the API schema in production, regardless of the flag.
  const isProduction = config.get<string>('app.nodeEnv') === 'production';
  if (!isProduction && config.get<boolean>('swagger.enabled')) {
    configureSwagger(app);
  }

  app.enableShutdownHooks();

  await app.listen(config.getOrThrow<number>('app.port'));
}

void bootstrap();
