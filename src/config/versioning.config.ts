import { VersioningType, type INestApplication } from '@nestjs/common';

import { appConfig } from './app.config';

export function configureVersioning(app: INestApplication): void {
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig.apiVersion,
  });
}
