import { AuthProvider } from '@/shared/enums';
import { Identity } from '../models/identity.model';

/**
 * Abstract identity repository.
 *
 * Defines the persistence contract for the Identity domain model.
 */
export abstract class IdentityRepository {
  abstract findById(id: string): Promise<Identity | null>;

  abstract findByUserId(userId: string): Promise<Identity[]>;

  abstract findByUserIdAndProvider(
    userId: string,
    provider: AuthProvider,
  ): Promise<Identity | null>;

  abstract findByProvider(provider: AuthProvider, providerUserId: string): Promise<Identity | null>;
}
