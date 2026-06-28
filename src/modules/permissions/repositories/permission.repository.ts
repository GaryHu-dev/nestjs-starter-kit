import { Permission } from '../models/permission.model';

/**
 * Abstract permission repository.
 */
export abstract class PermissionRepository {
  abstract findById(id: string): Promise<Permission | null>;

  abstract findByCode(code: string): Promise<Permission | null>;

  abstract findAll(): Promise<Permission[]>;

  abstract create(data: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>): Promise<Permission>;

  abstract update(
    id: string,
    data: Partial<Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Permission>;

  abstract delete(id: string): Promise<void>;
}
