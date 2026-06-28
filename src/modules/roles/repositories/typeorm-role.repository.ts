import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionOrmEntity } from '@/database/orm/permission.orm-entity';
import { RolePermissionOrmEntity } from '@/database/orm/role-permission.orm-entity';
import { RoleOrmEntity } from '@/database/orm/role.orm-entity';
import { PermissionRepository } from '@/modules/permissions/repositories/permission.repository';
import { Role } from '../models/role.model';
import { RoleRepository } from './role.repository';

/**
 * TypeORM implementation of RoleRepository.
 */
@Injectable()
export class TypeOrmRoleRepository extends RoleRepository {
  constructor(
    @InjectRepository(RoleOrmEntity)
    private readonly repo: Repository<RoleOrmEntity>,
    @InjectRepository(RolePermissionOrmEntity)
    private readonly rolePermissionRepo: Repository<RolePermissionOrmEntity>,
    private readonly permissionRepository: PermissionRepository,
  ) {
    super();
  }

  async findById(id: string): Promise<Role | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toModel(entity) : null;
  }

  async findByCode(code: string): Promise<Role | null> {
    const entity = await this.repo.findOne({ where: { code } });
    return entity ? this.toModel(entity) : null;
  }

  async findAll(): Promise<Role[]> {
    const entities = await this.repo.find({ order: { name: 'ASC' } });
    return entities.map((e) => this.toModel(e));
  }

  async create(data: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const entity = this.repo.create(data);
    const saved = await this.repo.save(entity);
    return this.toModel(saved);
  }

  async update(
    id: string,
    data: Partial<Omit<Role, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Role> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Role not found');
    const defined = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    Object.assign(entity, defined);
    const saved = await this.repo.save(entity);
    return this.toModel(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async assignPermission(roleId: string, permissionId: string, assignedBy: string): Promise<void> {
    const [role, permission] = await Promise.all([
      this.repo.findOne({ where: { id: roleId } }),
      this.permissionRepository.findById(permissionId),
    ]);
    if (!role) throw new NotFoundException('Role not found');
    if (!permission) throw new NotFoundException('Permission not found');

    const existing = await this.rolePermissionRepo.findOne({
      where: { role: { id: roleId }, permission: { id: permissionId } },
    });
    if (existing) return;

    const rp = this.rolePermissionRepo.create({
      role,
      permission: { id: permissionId } as PermissionOrmEntity,
      assignedBy,
    });
    await this.rolePermissionRepo.save(rp);
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    await this.rolePermissionRepo.delete({
      role: { id: roleId },
      permission: { id: permissionId },
    });
  }

  async findPermissionCodesByRoleId(roleId: string): Promise<string[]> {
    const rows = await this.rolePermissionRepo.find({
      where: { role: { id: roleId } },
      relations: { permission: true },
    });
    return rows.map((r) => r.permission.code);
  }

  private toModel(entity: RoleOrmEntity): Role {
    const model = new Role();
    model.id = entity.id;
    model.code = entity.code;
    model.name = entity.name;
    model.description = entity.description;
    model.isSystem = entity.isSystem;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    return model;
  }
}
