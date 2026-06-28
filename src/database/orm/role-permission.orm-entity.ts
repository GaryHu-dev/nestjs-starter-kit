import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@/database/entities/base.entity';
import { PermissionOrmEntity } from './permission.orm-entity';
import { RoleOrmEntity } from './role.orm-entity';

/**
 * Role-permission relationship ORM entity.
 */
@Entity({
  name: 'role_permissions',
})
@Unique(['role', 'permission'])
export class RolePermissionOrmEntity extends BaseEntity {
  @ManyToOne(() => RoleOrmEntity, (role) => role.rolePermissions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'role_id',
  })
  role!: RoleOrmEntity;

  @Index()
  @ManyToOne(() => PermissionOrmEntity, (permission) => permission.rolePermissions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'permission_id',
  })
  permission!: PermissionOrmEntity;

  @Column({
    name: 'assigned_by',
    type: 'varchar',
    nullable: true,
    length: 36,
  })
  assignedBy!: string | null;

  @Column({
    name: 'assigned_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  assignedAt!: Date;
}
