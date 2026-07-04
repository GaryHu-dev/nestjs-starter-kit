import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import type { SecurityOptions } from '@/config/config.type';
import configuration from '@/config/configuration';
import { envValidationSchema } from '@/config/env.validation';
import { DatabaseModule } from '@/database/database.module';
import { EmailModule } from '@/integrations/email';
import { AuditModule } from './common/audit';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggerModule } from './common/logger/logger.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AuthModule } from '@/modules/auth/auth.module';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { HealthModule } from './modules/health/health.module';
import { IdentitiesModule } from './modules/identities/identities.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const throttle = configService.getOrThrow<SecurityOptions['throttle']>('security.throttle');
        const isTest = configService.get<string>('app.nodeEnv') === 'test';
        // A single global bucket. Authentication routes tighten it per-handler
        // via @Throttle (see AuthController) rather than adding a second global
        // bucket, because every named bucket would otherwise apply to every
        // route. Disabled under `test` so suites aren't rate-limited.
        return {
          throttlers: [{ name: 'default', ttl: throttle.ttlMs, limit: throttle.limit }],
          skipIf: () => isTest,
        };
      },
    }),
    LoggerModule,
    AuditModule,
    DatabaseModule,
    EmailModule,
    AuthModule,
    UsersModule,
    IdentitiesModule,
    RolesModule,
    PermissionsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
