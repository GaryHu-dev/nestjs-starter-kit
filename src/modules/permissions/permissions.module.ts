import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionOrmEntity } from '@/database/orm/permission.orm-entity';
import { PermissionsController } from './controllers';
import { TypeOrmPermissionRepository } from './repositories/typeorm-permission.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { PermissionsService } from './services/permissions.service';

@Module({
  imports: [TypeOrmModule.forFeature([PermissionOrmEntity])],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    { provide: PermissionRepository, useClass: TypeOrmPermissionRepository },
  ],
  exports: [PermissionsService, PermissionRepository],
})
export class PermissionsModule {}
