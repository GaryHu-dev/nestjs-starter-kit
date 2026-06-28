import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@/database/entities/base.entity';
import { RoleOrmEntity } from './role.orm-entity';
import { UserOrmEntity } from './user.orm-entity';

/**
 * User-role relationship ORM entity.
 */
@Entity({
  name: 'user_roles',
})
@Unique(['user', 'role'])
export class UserRoleOrmEntity extends BaseEntity {
  @ManyToOne(() => UserOrmEntity, (user) => user.userRoles, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user!: UserOrmEntity;

  @Index()
  @ManyToOne(() => RoleOrmEntity, (role) => role.userRoles, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'role_id',
  })
  role!: RoleOrmEntity;

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

  @Column({
    name: 'expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  expiresAt!: Date | null;
}
