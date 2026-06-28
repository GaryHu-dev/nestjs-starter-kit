import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionOrmEntity } from '@/database/orm/permission.orm-entity';
import { Permission } from '../models/permission.model';
import { PermissionRepository } from './permission.repository';

/**
 * TypeORM implementation of PermissionRepository.
 */
@Injectable()
export class TypeOrmPermissionRepository extends PermissionRepository {
  constructor(
    @InjectRepository(PermissionOrmEntity)
    private readonly repo: Repository<PermissionOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<Permission | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toModel(entity) : null;
  }

  async findByCode(code: string): Promise<Permission | null> {
    const entity = await this.repo.findOne({ where: { code } });
    return entity ? this.toModel(entity) : null;
  }

  async findAll(): Promise<Permission[]> {
    const entities = await this.repo.find({ order: { name: 'ASC' } });
    return entities.map((e) => this.toModel(e));
  }

  async create(data: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>): Promise<Permission> {
    const entity = this.repo.create(data);
    const saved = await this.repo.save(entity);
    return this.toModel(saved);
  }

  async update(
    id: string,
    data: Partial<Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Permission> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Permission not found');
    const defined = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    Object.assign(entity, defined);
    const saved = await this.repo.save(entity);
    return this.toModel(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toModel(entity: PermissionOrmEntity): Permission {
    const model = new Permission();
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
