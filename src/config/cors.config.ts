import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function configureCors(app: INestApplication): void {
  const config = app.get(ConfigService);
  const frontendUrl = config.getOrThrow<string>('frontend.url');
  app.enableCors({
    origin: frontendUrl,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });
}
