import { Role } from '../models/role.model';

/**
 * Abstract role repository.
 */
export abstract class RoleRepository {
  abstract findById(id: string): Promise<Role | null>;

  abstract findByCode(code: string): Promise<Role | null>;

  abstract findAll(): Promise<Role[]>;

  abstract create(data: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role>;

  abstract update(
    id: string,
    data: Partial<Omit<Role, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Role>;

  abstract delete(id: string): Promise<void>;

  abstract assignPermission(
    roleId: string,
    permissionId: string,
    assignedBy: string,
  ): Promise<void>;

  abstract removePermission(roleId: string, permissionId: string): Promise<void>;

  abstract findPermissionCodesByRoleId(roleId: string): Promise<string[]>;
}
