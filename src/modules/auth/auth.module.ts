import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityOrmEntity } from '@/database/orm/identity.orm-entity';
import { RolePermissionOrmEntity } from '@/database/orm/role-permission.orm-entity';
import { UserOrmEntity } from '@/database/orm/user.orm-entity';
import { UserRoleOrmEntity } from '@/database/orm/user-role.orm-entity';
import { AUTH_STRATEGY } from '@/shared/constants';
import { AuthController } from './controllers';
import { AuthRepository } from './repositories';
import { AuthService, PasswordService, TokenService } from './services';
import { GithubStrategy, GoogleStrategy, JwtStrategy, RefreshStrategy } from './strategies';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserOrmEntity,
      IdentityOrmEntity,
      UserRoleOrmEntity,
      RolePermissionOrmEntity,
    ]),
    PassportModule.register({
      defaultStrategy: AUTH_STRATEGY.JWT,
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: config.getOrThrow<string>(
            'jwt.expiresIn',
          ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthService,
    PasswordService,
    TokenService,
    JwtStrategy,
    RefreshStrategy,
    GoogleStrategy,
    GithubStrategy,
  ],
  exports: [PassportModule, JwtModule, AuthService, TokenService],
})
export class AuthModule {}
