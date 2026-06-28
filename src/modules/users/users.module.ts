import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from '@/database/orm/user.orm-entity';
import { UsersController } from './controllers/users.controller';
import { TypeOrmUserRepository } from './repositories/typeorm-user.repository';
import { UserRepository } from './repositories/user.repository';
import { UsersService } from './services/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity])],
  controllers: [UsersController],
  providers: [UsersService, { provide: UserRepository, useClass: TypeOrmUserRepository }],
  exports: [UsersService, UserRepository],
})
export class UsersModule {}
