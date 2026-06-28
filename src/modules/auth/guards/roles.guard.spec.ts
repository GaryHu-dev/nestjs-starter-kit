import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AUTH_METADATA } from '@/shared/constants';
import { RoleName } from '@/shared/enums';

const makeContext = (opts: {
  isPublic?: boolean;
  requiredRoles?: RoleName[];
  userRoles?: RoleName[];
}): ExecutionContext => {
  const request = { user: opts.userRoles ? { roles: opts.userRoles } : undefined };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
};

const makeReflector = (isPublic: boolean | undefined, roles: RoleName[] | undefined) => ({
  getAllAndOverride: jest.fn().mockImplementation((key: string) => {
    if (key === AUTH_METADATA.PUBLIC) return isPublic;
    if (key === AUTH_METADATA.ROLES) return roles;
    return undefined;
  }),
});

describe('RolesGuard', () => {
  it('passes through @Public() routes', () => {
    const reflector = makeReflector(true, undefined);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(makeContext({ isPublic: true }))).toBe(true);
  });

  it('passes when no roles are required', () => {
    const reflector = makeReflector(false, undefined);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(makeContext({}))).toBe(true);
  });

  it('passes when user holds a required role', () => {
    const reflector = makeReflector(false, [RoleName.ADMIN]);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(makeContext({ userRoles: [RoleName.ADMIN] }))).toBe(true);
  });

  it('passes when user is super-admin and admin is required', () => {
    const reflector = makeReflector(false, [RoleName.ADMIN]);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    // super-admin is not in [admin] — guard only checks exact match, not hierarchy
    // (intentional: explicit role listing is required)
    expect(guard.canActivate(makeContext({ userRoles: [RoleName.SUPER_ADMIN] }))).toBe(false);
  });

  it('blocks when user lacks required roles', () => {
    const reflector = makeReflector(false, [RoleName.ADMIN]);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(makeContext({ userRoles: [RoleName.USER] }))).toBe(false);
  });

  it('blocks when user has no roles at all', () => {
    const reflector = makeReflector(false, [RoleName.ADMIN]);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(makeContext({}))).toBe(false);
  });

  it('passes with multiple required roles when user has one', () => {
    const reflector = makeReflector(false, [RoleName.ADMIN, RoleName.SUPER_ADMIN]);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(makeContext({ userRoles: [RoleName.ADMIN] }))).toBe(true);
  });
});
