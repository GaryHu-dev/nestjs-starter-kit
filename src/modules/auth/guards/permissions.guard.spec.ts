import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { AUTH_METADATA } from '@/shared/constants';
import { PermissionName } from '@/shared/enums';

const makeContext = (opts: {
  isPublic?: boolean;
  userPermissions?: string[];
}): ExecutionContext => {
  const request = {
    user: opts.userPermissions !== undefined ? { permissions: opts.userPermissions } : undefined,
  };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
};

const makeReflector = (isPublic: boolean | undefined, perms: string[] | undefined) => ({
  getAllAndOverride: jest.fn().mockImplementation((key: string) => {
    if (key === AUTH_METADATA.PUBLIC) return isPublic;
    if (key === AUTH_METADATA.PERMISSIONS) return perms;
    return undefined;
  }),
});

describe('PermissionsGuard', () => {
  it('passes @Public() routes', () => {
    const guard = new PermissionsGuard(makeReflector(true, undefined) as unknown as Reflector);
    expect(guard.canActivate(makeContext({ isPublic: true }))).toBe(true);
  });

  it('passes when no permissions required', () => {
    const guard = new PermissionsGuard(makeReflector(false, undefined) as unknown as Reflector);
    expect(guard.canActivate(makeContext({}))).toBe(true);
  });

  it('passes when user holds the wildcard * permission', () => {
    const guard = new PermissionsGuard(
      makeReflector(false, ['users:read']) as unknown as Reflector,
    );
    expect(guard.canActivate(makeContext({ userPermissions: [PermissionName.ALL] }))).toBe(true);
  });

  it('passes when user has the required permission', () => {
    const guard = new PermissionsGuard(
      makeReflector(false, ['users:read']) as unknown as Reflector,
    );
    expect(guard.canActivate(makeContext({ userPermissions: ['users:read'] }))).toBe(true);
  });

  it('blocks when user lacks the required permission', () => {
    const guard = new PermissionsGuard(
      makeReflector(false, ['users:delete']) as unknown as Reflector,
    );
    expect(guard.canActivate(makeContext({ userPermissions: ['users:read'] }))).toBe(false);
  });

  it('blocks when user has no permissions', () => {
    const guard = new PermissionsGuard(
      makeReflector(false, ['users:read']) as unknown as Reflector,
    );
    expect(guard.canActivate(makeContext({}))).toBe(false);
  });

  it('passes when user has one of multiple required permissions', () => {
    const guard = new PermissionsGuard(
      makeReflector(false, ['users:read', 'users:write']) as unknown as Reflector,
    );
    expect(guard.canActivate(makeContext({ userPermissions: ['users:write'] }))).toBe(true);
  });
});
