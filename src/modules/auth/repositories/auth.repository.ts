import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { IdentityOrmEntity } from '@/database/orm/identity.orm-entity';
import { RolePermissionOrmEntity } from '@/database/orm/role-permission.orm-entity';
import { UserOrmEntity } from '@/database/orm/user.orm-entity';
import { UserRoleOrmEntity } from '@/database/orm/user-role.orm-entity';
import { AuthProvider, PermissionName, RoleName, UserStatus } from '@/shared/enums';

export interface AuthUserView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  status: UserStatus;
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
          emailVerified: false,
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
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code: string }).code === '23505'
      ) {
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

    if (!identity) return null;

    return {
      id: identity.id,
      userId: identity.user.id,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      passwordHash: identity.passwordHash,
      refreshTokenHash: identity.refreshTokenHash,
      lastLoginAt: identity.lastLoginAt,
    };
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

    if (!identity) return null;

    return {
      id: identity.id,
      userId: identity.user.id,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      passwordHash: identity.passwordHash,
      refreshTokenHash: identity.refreshTokenHash,
      lastLoginAt: identity.lastLoginAt,
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

  async findUserRolesAndPermissions(
    userId: string,
  ): Promise<{ roles: RoleName[]; permissions: PermissionName[] }> {
    const userRoles = await this.userRoleRepo.find({
      where: { user: { id: userId } },
      relations: { role: true },
    });

    if (userRoles.length === 0) {
      return { roles: [], permissions: [] };
    }

    const roleIds = userRoles.map((ur) => ur.role.id);
    const roles = userRoles.map((ur) => ur.role.code as RoleName);

    const rolePermissions = await this.rolePermissionRepo
      .createQueryBuilder('rp')
      .innerJoinAndSelect('rp.permission', 'permission')
      .where('rp.role_id IN (:...roleIds)', { roleIds })
      .getMany();

    const permissionSet = new Set<PermissionName>();
    for (const rp of rolePermissions) {
      permissionSet.add(rp.permission.code as PermissionName);
    }

    return { roles, permissions: Array.from(permissionSet) };
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
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code: string }).code === '23505'
      ) {
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
    };
  }
}
