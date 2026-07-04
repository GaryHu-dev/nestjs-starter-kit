import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { DatabaseOptions } from '@/config/config.type';
import { buildPostgresBaseOptions } from './data-source-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('app.nodeEnv') === 'production';
        const db = configService.getOrThrow<DatabaseOptions>('database');

        return {
          ...buildPostgresBaseOptions({
            host: db.host,
            port: db.port,
            username: db.username,
            password: db.password,
            database: db.database,
            ssl: db.ssl,
            sslRejectUnauthorized: db.sslRejectUnauthorized,
            logging: db.logging,
            poolMax: db.poolMax,
            statementTimeoutMs: db.statementTimeoutMs,
            lockTimeoutMs: db.lockTimeoutMs,
          }),
          autoLoadEntities: true,
          // Schema auto-sync is never allowed in production — use migrations.
          synchronize: isProduction ? false : db.synchronize,
          retryAttempts: 5,
          retryDelay: 3000,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
