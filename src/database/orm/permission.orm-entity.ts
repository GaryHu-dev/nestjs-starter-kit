import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '@/database/entities/base.entity';
import { RolePermissionOrmEntity } from './role-permission.orm-entity';

/**
 * Permission ORM entity.
 *
 * Represents a system permission.
 */
@Entity({
  name: 'permissions',
})
export class PermissionOrmEntity extends BaseEntity {
  @Column({
    unique: true,
    length: 150,
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

  @OneToMany(() => RolePermissionOrmEntity, (rolePermission) => rolePermission.permission)
  rolePermissions!: RolePermissionOrmEntity[];
}
