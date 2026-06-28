import { INestApplication, ValidationPipe } from '@nestjs/common';

export const configureValidation = (app: INestApplication): void => {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
};
