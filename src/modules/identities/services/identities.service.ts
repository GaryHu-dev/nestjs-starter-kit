import { Injectable } from '@nestjs/common';
import { Identity } from '../models/identity.model';
import { IdentityRepository } from '../repositories/identity.repository';

/**
 * Identities service.
 *
 * Provides read access to a user's linked authentication identities.
 * Mutation of identities is handled by AuthService during login, OAuth
 * callbacks, and password change flows.
 */
@Injectable()
export class IdentitiesService {
  constructor(private readonly identityRepository: IdentityRepository) {}

  async findByUserId(userId: string): Promise<Identity[]> {
    return this.identityRepository.findByUserId(userId);
  }
}
