import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermissionOrmEntity } from '@/database/orm/role-permission.orm-entity';
import { RoleOrmEntity } from '@/database/orm/role.orm-entity';
import { PermissionsModule } from '@/modules/permissions/permissions.module';
import { RolesController } from './controllers';
import { TypeOrmRoleRepository } from './repositories/typeorm-role.repository';
import { RoleRepository } from './repositories/role.repository';
import { RolesService } from './services/roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoleOrmEntity, RolePermissionOrmEntity]), PermissionsModule],
  controllers: [RolesController],
  providers: [RolesService, { provide: RoleRepository, useClass: TypeOrmRoleRepository }],
  exports: [RolesService, RoleRepository],
})
export class RolesModule {}
