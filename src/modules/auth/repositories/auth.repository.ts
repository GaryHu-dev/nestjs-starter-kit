import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { IdentityOrmEntity } from '@/database/orm/identity.orm-entity';
import { RolePermissionOrmEntity } from '@/database/orm/role-permission.orm-entity';
import { UserOrmEntity } from '@/database/orm/user.orm-entity';
import { UserRoleOrmEntity } from '@/database/orm/user-role.orm-entity';
import { AuthProvider, UserStatus } from '@/shared/enums';
import { isUniqueViolation } from '@/shared/utils';

export interface AuthUserView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  status: UserStatus;
  tokenVersion: number;
}

/**
 * The per-request authorization context: current account status, token version
 * and the user's live role/permission codes. Loaded fresh on every
 * authenticated request so grants and revocations take effect immediately.
 */
export interface AuthContext {
  status: UserStatus;
  tokenVersion: number;
  roles: string[];
  permissions: string[];
}

export interface CreateUserWithIdentityInput {
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
  provider: AuthProvider;
  providerUserId: string;
  passwordHash: string | null;
  emailVerified: boolean;
}

export interface CreateUserWithIdentityResult {
  user: AuthUserView;
  identityId: string;
}

export interface IdentityWithHash {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerUserId: string;
  passwordHash: string | null;
  refreshTokenHash: string | null;
  lastLoginAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export interface OAuthIdentityView {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerUserId: string;
  lastLoginAt: Date | null;
  user: AuthUserView;
}

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepo: Repository<UserOrmEntity>,
    @InjectRepository(IdentityOrmEntity)
    private readonly identityRepo: Repository<IdentityOrmEntity>,
    @InjectRepository(UserRoleOrmEntity)
    private readonly userRoleRepo: Repository<UserRoleOrmEntity>,
    @InjectRepository(RolePermissionOrmEntity)
    private readonly rolePermissionRepo: Repository<RolePermissionOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createUserWithIdentity(
    input: CreateUserWithIdentityInput,
  ): Promise<CreateUserWithIdentityResult> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const existing = await manager.findOne(UserOrmEntity, {
          where: { email: input.email },
        });
        if (existing) throw new ConflictException('Email already registered');

        const user = manager.create(UserOrmEntity, {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          emailVerified: input.emailVerified,
          status: UserStatus.ACTIVE,
        });
        const savedUser = await manager.save(UserOrmEntity, user);

        const identity = manager.create(IdentityOrmEntity, {
          user: savedUser,
          provider: input.provider,
          providerUserId: input.providerUserId,
          passwordHash: input.passwordHash,
          lastLoginAt: new Date(),
        });
        const savedIdentity = await manager.save(IdentityOrmEntity, identity);

        return {
          user: this.toUserView(savedUser),
          identityId: savedIdentity.id,
        };
      });
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      if (isUniqueViolation(err)) {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }
  }

  async findIdentityByEmailAndProvider(
    email: string,
    provider: AuthProvider,
  ): Promise<IdentityWithHash | null> {
    const identity = await this.identityRepo
      .createQueryBuilder('identity')
      .innerJoinAndSelect('identity.user', 'user')
      .addSelect('identity.passwordHash')
      .addSelect('identity.refreshTokenHash')
      .where('user.email = :email', { email })
      .andWhere('identity.provider = :provider', { provider })
      .getOne();

    return identity ? this.toIdentityWithHash(identity) : null;
  }

  async findIdentityWithHashByUserIdAndProvider(
    userId: string,
    provider: AuthProvider,
  ): Promise<IdentityWithHash | null> {
    const identity = await this.identityRepo
      .createQueryBuilder('identity')
      .innerJoinAndSelect('identity.user', 'user')
      .addSelect('identity.refreshTokenHash')
      .addSelect('identity.passwordHash')
      .where('user.id = :userId', { userId })
      .andWhere('identity.provider = :provider', { provider })
      .getOne();

    return identity ? this.toIdentityWithHash(identity) : null;
  }

  private toIdentityWithHash(identity: IdentityOrmEntity): IdentityWithHash {
    return {
      id: identity.id,
      userId: identity.user.id,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      passwordHash: identity.passwordHash,
      refreshTokenHash: identity.refreshTokenHash,
      lastLoginAt: identity.lastLoginAt,
      failedLoginAttempts: identity.failedLoginAttempts,
      lockedUntil: identity.lockedUntil,
    };
  }

  async findIdentityByProvider(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<OAuthIdentityView | null> {
    const identity = await this.identityRepo
      .createQueryBuilder('identity')
      .innerJoinAndSelect('identity.user', 'user')
      .where('identity.provider = :provider', { provider })
      .andWhere('identity.providerUserId = :providerUserId', { providerUserId })
      .getOne();

    if (!identity) return null;

    return {
      id: identity.id,
      userId: identity.user.id,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      lastLoginAt: identity.lastLoginAt,
      user: this.toUserView(identity.user),
    };
  }

  async findUserById(id: string): Promise<AuthUserView | null> {
    const entity = await this.userRepo.findOne({ where: { id } });
    return entity ? this.toUserView(entity) : null;
  }

  async findUserByEmail(email: string): Promise<AuthUserView | null> {
    const entity = await this.userRepo.findOne({ where: { email } });
    return entity ? this.toUserView(entity) : null;
  }

  /**
   * Load the live authorization context for a user: account status, token
   * version and current role/permission codes. Returns null when the user does
   * not exist. Called by JwtStrategy on every authenticated request.
   */
  async findAuthContext(userId: string): Promise<AuthContext | null> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, status: true, tokenVersion: true },
    });
    if (!user) return null;

    // Single join across user_roles → roles → role_permissions → permissions,
    // so the whole authorization set is one query (plus the user query above)
    // rather than a separate roles fetch and per-role permissions fetch.
    // Intentionally uncached: a cache would reintroduce the very revocation/
    // stale-grant delay this per-request read exists to eliminate.
    const rows = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin('ur.role', 'role')
      .leftJoin('role.rolePermissions', 'rp')
      .leftJoin('rp.permission', 'permission')
      .where('ur.user = :userId', { userId })
      .select('role.code', 'roleCode')
      .addSelect('permission.code', 'permissionCode')
      .getRawMany<{ roleCode: string; permissionCode: string | null }>();

    const roles = [...new Set(rows.map((r) => r.roleCode))];
    const permissions = [
      ...new Set(rows.map((r) => r.permissionCode).filter((c): c is string => c !== null)),
    ];

    return { status: user.status, tokenVersion: user.tokenVersion, roles, permissions };
  }

  /**
   * Invalidate every access/refresh token previously issued to a user by
   * advancing their token version (logout-all, password change, deactivation).
   */
  async bumpTokenVersion(userId: string): Promise<void> {
    await this.userRepo.increment({ id: userId }, 'tokenVersion', 1);
  }

  async updateIdentityLockState(
    identityId: string,
    failedLoginAttempts: number,
    lockedUntil: Date | null,
  ): Promise<void> {
    await this.identityRepo.update(identityId, { failedLoginAttempts, lockedUntil });
  }

  /**
   * Record a failed login attempt atomically.
   *
   * Serialised with a row-level `FOR UPDATE` lock so concurrent failures cannot
   * lose increments (which would weaken the lockout). Resets the counter when a
   * previous lock has already expired, so a returning user gets a fresh set of
   * attempts rather than being re-locked on their first try.
   */
  async registerFailedLogin(
    identityId: string,
    maxAttempts: number,
    lockoutMs: number,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const identity = await manager
        .createQueryBuilder(IdentityOrmEntity, 'identity')
        .setLock('pessimistic_write')
        .where('identity.id = :id', { id: identityId })
        .getOne();
      if (!identity) return;

      const now = Date.now();
      const lockExpired = identity.lockedUntil !== null && identity.lockedUntil.getTime() <= now;
      const attempts = lockExpired ? 1 : identity.failedLoginAttempts + 1;
      const lockedUntil =
        attempts >= maxAttempts
          ? new Date(now + lockoutMs)
          : lockExpired
            ? null
            : identity.lockedUntil;

      await manager.update(IdentityOrmEntity, identityId, {
        failedLoginAttempts: attempts,
        lockedUntil,
      });
    });
  }

  async updateIdentityRefreshToken(
    identityId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.identityRepo.update(identityId, {
      refreshTokenHash,
      ...(refreshTokenHash !== null && { lastLoginAt: new Date() }),
    });
  }

  async updateIdentityPasswordHash(identityId: string, passwordHash: string): Promise<void> {
    await this.identityRepo.update(identityId, { passwordHash });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.userRepo.update(userId, { emailVerified: true });
  }

  /**
   * Atomically take over an unverified account with a verified OAuth identity.
   *
   * In a single transaction: purge every pre-existing identity (a pre-seeded
   * local password AND any OAuth identity a squatter attached to the unverified
   * address — none were ever proven), mark the email verified, revoke all
   * outstanding tokens, and create the now-verified provider's identity. Being
   * atomic is essential: a partial failure must not leave the account verified
   * with a squatter's identity still attached (which the trusted
   * existing-identity fast path would then accept). Returns the new identity id.
   */
  async takeOverWithOAuthIdentity(
    userId: string,
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(IdentityOrmEntity, { user: { id: userId } });
      await manager.update(UserOrmEntity, userId, { emailVerified: true });
      await manager.increment(UserOrmEntity, { id: userId }, 'tokenVersion', 1);
      const identity = manager.create(IdentityOrmEntity, {
        user: manager.create(UserOrmEntity, { id: userId } as Partial<UserOrmEntity>),
        provider,
        providerUserId,
        lastLoginAt: new Date(),
      });
      const saved = await manager.save(IdentityOrmEntity, identity);
      return saved.id;
    });
  }

  async upsertOAuthIdentity(
    userId: string,
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<string> {
    try {
      let identity = await this.identityRepo.findOne({
        where: { provider, providerUserId },
      });

      if (!identity) {
        const userRef = this.userRepo.create({ id: userId } as Partial<UserOrmEntity>);
        identity = this.identityRepo.create({
          user: userRef,
          provider,
          providerUserId,
        });
      }

      identity.lastLoginAt = new Date();
      const saved = await this.identityRepo.save(identity);
      return saved.id;
    } catch (err) {
      if (isUniqueViolation(err)) {
        // Concurrent OAuth login race — re-fetch the identity that won
        const existing = await this.identityRepo.findOne({ where: { provider, providerUserId } });
        if (existing) return existing.id;
      }
      throw err;
    }
  }

  private toUserView(entity: UserOrmEntity): AuthUserView {
    return {
      id: entity.id,
      email: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      displayName: entity.displayName,
      avatarUrl: entity.avatarUrl,
      emailVerified: entity.emailVerified,
      status: entity.status,
      tokenVersion: entity.tokenVersion,
    };
  }
}
