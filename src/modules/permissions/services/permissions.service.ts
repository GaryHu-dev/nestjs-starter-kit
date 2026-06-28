import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Permission } from '../models/permission.model';
import { PermissionRepository } from '../repositories/permission.repository';
import type { CreatePermissionDto } from '../dto/request/create-permission.dto';
import type { UpdatePermissionDto } from '../dto/request/update-permission.dto';

/**
 * Permissions service.
 *
 * Manages permission definitions used across the RBAC system.
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.findAll();
  }

  async findById(id: string): Promise<Permission> {
    const permission = await this.permissionRepository.findById(id);
    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionRepository.findByCode(dto.code);
    if (existing) throw new ConflictException('Permission code already exists');

    return this.permissionRepository.create({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      isSystem: false,
    });
  }

  async update(id: string, dto: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.findById(id);
    if (permission.isSystem) throw new ForbiddenException('System permissions cannot be modified');

    return this.permissionRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
    });
  }

  async remove(id: string): Promise<void> {
    const permission = await this.findById(id);
    if (permission.isSystem) throw new ForbiddenException('System permissions cannot be deleted');
    await this.permissionRepository.delete(id);
  }
}
