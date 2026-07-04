import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '@/database/entities/base.entity';
import { UserStatus } from '@/shared/enums';
import { IdentityOrmEntity } from './identity.orm-entity';
import { UserRoleOrmEntity } from './user-role.orm-entity';

/**
 * User ORM entity.
 *
 * Stores the core user profile.
 *
 * Authentication credentials (password, OAuth provider IDs, etc.)
 * are stored in the IdentityOrmEntity.
 */
@Entity({
  name: 'users',
})
export class UserOrmEntity extends BaseEntity {
  @Column({
    unique: true,
    length: 255,
  })
  email!: string;

  @Column({
    name: 'first_name',
    length: 100,
  })
  firstName!: string;

  @Column({
    name: 'last_name',
    length: 100,
  })
  lastName!: string;

  @Column({
    name: 'display_name',
    type: 'varchar',
    nullable: true,
    length: 100,
  })
  displayName!: string | null;

  @Column({
    name: 'avatar_url',
    type: 'varchar',
    nullable: true,
    length: 500,
  })
  avatarUrl!: string | null;

  @Column({
    name: 'email_verified',
    default: false,
  })
  emailVerified!: boolean;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status!: UserStatus;

  /**
   * Monotonic token generation. Every access/refresh token embeds the value it
   * was minted with; bumping it (logout, password change, OAuth account
   * takeover) invalidates all previously issued tokens on the next request,
   * closing the stateless-JWT revocation window. Deactivation does not need a
   * bump — it is caught by the per-request account-status check; role changes
   * likewise need none, as authorization is resolved from the DB each request.
   */
  @Column({
    name: 'token_version',
    type: 'int',
    default: 0,
  })
  tokenVersion!: number;

  @OneToMany(() => IdentityOrmEntity, (identity) => identity.user)
  identities!: IdentityOrmEntity[];

  @OneToMany(() => UserRoleOrmEntity, (userRole) => userRole.user)
  userRoles!: UserRoleOrmEntity[];
}
