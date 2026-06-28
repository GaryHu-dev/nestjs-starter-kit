import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '@/database/entities/base.entity';
import { RolePermissionOrmEntity } from './role-permission.orm-entity';
import { UserRoleOrmEntity } from './user-role.orm-entity';

/**
 * Role ORM entity.
 *
 * Represents a system or custom role.
 */
@Entity({
  name: 'roles',
})
export class RoleOrmEntity extends BaseEntity {
  @Column({
    unique: true,
    length: 100,
  })
  code!: string;

  @Column({
    length: 100,
  })
  name!: string;

  @Column({
    nullable: true,
    type: 'text',
  })
  description!: string | null;

  @Column({
    name: 'is_system',
    default: false,
  })
  isSystem!: boolean;

  @OneToMany(() => UserRoleOrmEntity, (userRole) => userRole.role)
  userRoles!: UserRoleOrmEntity[];

  @OneToMany(() => RolePermissionOrmEntity, (rolePermission) => rolePermission.role)
  rolePermissions!: RolePermissionOrmEntity[];
}
