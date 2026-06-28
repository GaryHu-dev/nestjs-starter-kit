import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityOrmEntity } from '@/database/orm/identity.orm-entity';
import { IdentitiesController } from './controllers/identities.controller';
import { TypeOrmIdentityRepository } from './repositories/typeorm-identity.repository';
import { IdentityRepository } from './repositories/identity.repository';
import { IdentitiesService } from './services/identities.service';

@Module({
  imports: [TypeOrmModule.forFeature([IdentityOrmEntity])],
  controllers: [IdentitiesController],
  providers: [
    IdentitiesService,
    { provide: IdentityRepository, useClass: TypeOrmIdentityRepository },
  ],
  exports: [IdentitiesService, IdentityRepository],
})
export class IdentitiesModule {}
