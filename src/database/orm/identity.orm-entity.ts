import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/database/entities/base.entity';
import { AuthProvider } from '@/shared/enums';
import { UserOrmEntity } from './user.orm-entity';

/**
 * User identity ORM entity.
 *
 * Stores authentication credentials for different providers.
 */
@Entity({
  name: 'identities',
})
@Index(['provider', 'providerUserId'], {
  unique: true,
})
export class IdentityOrmEntity extends BaseEntity {
  @Index()
  @ManyToOne(() => UserOrmEntity, (user) => user.identities, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user!: UserOrmEntity;

  @Column({
    type: 'enum',
    enum: AuthProvider,
  })
  provider!: AuthProvider;

  @Column({
    name: 'provider_user_id',
    length: 255,
  })
  providerUserId!: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    nullable: true,
    select: false,
    length: 255,
  })
  passwordHash!: string | null;

  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    nullable: true,
    select: false,
    length: 255,
  })
  refreshTokenHash!: string | null;

  @Column({
    name: 'expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  expiresAt!: Date | null;

  @Column({
    name: 'last_login_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastLoginAt!: Date | null;
}
