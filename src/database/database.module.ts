import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('app.nodeEnv') === 'production';

        return {
          type: 'postgres',
          host: configService.getOrThrow<string>('database.host'),
          port: configService.getOrThrow<number>('database.port'),
          username: configService.getOrThrow<string>('database.username'),
          password: configService.getOrThrow<string>('database.password'),
          database: configService.getOrThrow<string>('database.database'),
          autoLoadEntities: true,
          // Schema auto-sync is never allowed in production — use migrations.
          synchronize: isProduction
            ? false
            : (configService.get<boolean>('database.synchronize') ?? false),
          logging: configService.get<boolean>('database.logging') ?? false,
          maxQueryExecutionTime: 1000,
          retryAttempts: 5,
          retryDelay: 3000,
          namingStrategy: new SnakeNamingStrategy(),
          ssl: configService.get<boolean>('database.ssl') ? { rejectUnauthorized: true } : false,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
