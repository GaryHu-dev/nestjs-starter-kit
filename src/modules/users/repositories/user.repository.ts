import { User } from '../models/user.model';

/**
 * Abstract user repository.
 *
 * Defines the persistence contract for the User domain model.
 * Services depend on this abstraction; the TypeORM implementation
 * is bound at module level.
 */
export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;

  abstract findByEmail(email: string): Promise<User | null>;

  abstract findAll(page: number, pageSize: number): Promise<[User[], number]>;

  abstract create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<User>;

  abstract update(
    id: string,
    data: Partial<Omit<User, 'id' | 'email' | 'createdAt' | 'updatedAt' | 'deletedAt'>>,
  ): Promise<User>;

  abstract softDelete(id: string): Promise<void>;
}
