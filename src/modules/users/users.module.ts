import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleOrmEntity } from '@/database/orm/role.orm-entity';
import { UserOrmEntity } from '@/database/orm/user.orm-entity';
import { UserRoleOrmEntity } from '@/database/orm/user-role.orm-entity';
import { UsersController } from './controllers/users.controller';
import { TypeOrmUserRepository } from './repositories/typeorm-user.repository';
import { UserRepository } from './repositories/user.repository';
import { UsersService } from './services/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity, UserRoleOrmEntity, RoleOrmEntity])],
  controllers: [UsersController],
  providers: [UsersService, { provide: UserRepository, useClass: TypeOrmUserRepository }],
  exports: [UsersService, UserRepository],
})
export class UsersModule {}
