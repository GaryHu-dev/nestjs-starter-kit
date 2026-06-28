import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOrmEntity } from '@/database/orm/user.orm-entity';
import { UserStatus } from '@/shared/enums';
import { User } from '../models/user.model';
import { UserRepository } from './user.repository';

/**
 * TypeORM implementation of UserRepository.
 */
@Injectable()
export class TypeOrmUserRepository extends UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toModel(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repo.findOne({ where: { email } });
    return entity ? this.toModel(entity) : null;
  }

  async findAll(page: number, pageSize: number): Promise<[User[], number]> {
    const [entities, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return [entities.map((e) => this.toModel(e)), total];
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<User> {
    const entity = this.repo.create({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      emailVerified: data.emailVerified,
      status: data.status,
    });
    const saved = await this.repo.save(entity);
    return this.toModel(saved);
  }

  async update(
    id: string,
    data: Partial<Omit<User, 'id' | 'email' | 'createdAt' | 'updatedAt' | 'deletedAt'>>,
  ): Promise<User> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('User not found');
    Object.assign(entity, data);
    const saved = await this.repo.save(entity);
    return this.toModel(saved);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  private toModel(entity: UserOrmEntity): User {
    const model = new User();
    model.id = entity.id;
    model.email = entity.email;
    model.firstName = entity.firstName;
    model.lastName = entity.lastName;
    model.displayName = entity.displayName;
    model.avatarUrl = entity.avatarUrl;
    model.emailVerified = entity.emailVerified;
    model.status = entity.status ?? UserStatus.PENDING;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;
    return model;
  }
}
