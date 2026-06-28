/**
 * Configure the OpenAPI (Swagger) documentation.
 *
 * Swagger is enabled only for API documentation and
 * development tooling. Application metadata is sourced
 * from the static application configuration.
 */
import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { appConfig } from './app.config';

export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle(appConfig.name)
    .setDescription(appConfig.description)
    .setVersion(appConfig.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      appConfig.swaggerSecurityScheme,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(appConfig.swaggerPath, app, document, {
    customSiteTitle: appConfig.name,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
    },
  });
}
