import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityOrmEntity } from '@/database/orm/identity.orm-entity';
import { AuthProvider } from '@/shared/enums';
import { Identity } from '../models/identity.model';
import { IdentityRepository } from './identity.repository';

/**
 * TypeORM implementation of IdentityRepository.
 */
@Injectable()
export class TypeOrmIdentityRepository extends IdentityRepository {
  constructor(
    @InjectRepository(IdentityOrmEntity)
    private readonly repo: Repository<IdentityOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<Identity | null> {
    const entity = await this.repo.findOne({ where: { id }, relations: { user: true } });
    return entity ? this.toModel(entity) : null;
  }

  async findByUserId(userId: string): Promise<Identity[]> {
    const entities = await this.repo.find({
      where: { user: { id: userId } },
      relations: { user: true },
    });
    return entities.map((e) => this.toModel(e));
  }

  async findByUserIdAndProvider(userId: string, provider: AuthProvider): Promise<Identity | null> {
    const entity = await this.repo.findOne({
      where: { user: { id: userId }, provider },
      relations: { user: true },
    });
    return entity ? this.toModel(entity) : null;
  }

  async findByProvider(provider: AuthProvider, providerUserId: string): Promise<Identity | null> {
    const entity = await this.repo.findOne({
      where: { provider, providerUserId },
      relations: { user: true },
    });
    return entity ? this.toModel(entity) : null;
  }

  private toModel(entity: IdentityOrmEntity): Identity {
    const model = new Identity();
    model.id = entity.id;
    model.userId = entity.user.id;
    model.provider = entity.provider;
    model.providerUserId = entity.providerUserId;
    model.expiresAt = entity.expiresAt;
    model.lastLoginAt = entity.lastLoginAt;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    return model;
  }
}
