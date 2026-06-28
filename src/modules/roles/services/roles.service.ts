import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../models/role.model';
import { RoleRepository } from '../repositories/role.repository';
import type { CreateRoleDto } from '../dto/request/create-role.dto';
import type { UpdateRoleDto } from '../dto/request/update-role.dto';

/**
 * Roles service.
 *
 * Manages role definitions and role-to-permission assignments.
 */
@Injectable()
export class RolesService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async findAll(): Promise<Role[]> {
    return this.roleRepository.findAll();
  }

  async findById(id: string): Promise<Role> {
    const role = await this.roleRepository.findById(id);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.roleRepository.findByCode(dto.code);
    if (existing) throw new ConflictException('Role code already exists');

    return this.roleRepository.create({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      isSystem: false,
    });
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findById(id);
    if (role.isSystem) throw new ForbiddenException('System roles cannot be modified');

    return this.roleRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
    });
  }

  async remove(id: string): Promise<void> {
    const role = await this.findById(id);
    if (role.isSystem) throw new ForbiddenException('System roles cannot be deleted');
    await this.roleRepository.delete(id);
  }

  async assignPermission(roleId: string, permissionId: string, assignedBy: string): Promise<void> {
    await this.roleRepository.assignPermission(roleId, permissionId, assignedBy);
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    await this.findById(roleId);
    await this.roleRepository.removePermission(roleId, permissionId);
  }

  async findPermissions(roleId: string): Promise<string[]> {
    await this.findById(roleId);
    return this.roleRepository.findPermissionCodesByRoleId(roleId);
  }
}
