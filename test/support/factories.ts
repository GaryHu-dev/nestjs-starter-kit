import { RoleName } from '@/shared/enums';
import { DEFAULT_PASSWORD } from './constants';

/**
 * Registration payload accepted by `POST /auth/register`.
 */
export interface RegisterDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

/**
 * Builds a valid registration payload. Defaults are deterministic so tests
 * can assert on them directly; pass overrides for the field under test.
 *
 * This is the single source of truth for default test-user data — change
 * it here rather than scattering literals across the specs.
 */
export function buildRegisterDto(overrides: Partial<RegisterDto> = {}): RegisterDto {
  return {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: DEFAULT_PASSWORD,
    ...overrides,
  };
}

/**
 * A role identified by its unique code and display name.
 */
export interface RoleDefinition {
  code: string;
  name: string;
}

/**
 * Built-in roles used to bootstrap privileged test users.
 */
export const ROLE_FIXTURES: Record<'admin' | 'superAdmin', RoleDefinition> = {
  admin: { code: RoleName.ADMIN, name: 'Admin' },
  superAdmin: { code: RoleName.SUPER_ADMIN, name: 'Super Admin' },
};
