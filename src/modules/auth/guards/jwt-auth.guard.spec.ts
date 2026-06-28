import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AUTH_METADATA } from '@/shared/constants';

const makeContext = (): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ headers: {} }),
      getResponse: () => ({}),
    }),
  }) as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  it('returns true immediately for @Public() routes without calling passport', () => {
    const getAllAndOverride = jest.fn().mockReturnValue(true);
    const reflector = { getAllAndOverride } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    const ctx = makeContext();

    const result = guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(getAllAndOverride).toHaveBeenCalledWith(AUTH_METADATA.PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
  });

  it('delegates to passport for non-public routes (does not short-circuit)', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    const ctx = makeContext();

    // Spy on the parent AuthGuard's canActivate to prevent actual passport execution
    const guardAny = guard as unknown as Record<string, unknown>;
    const parentProto = Object.getPrototypeOf(Object.getPrototypeOf(guardAny)) as Record<
      string,
      jest.Mock
    >;
    const original = parentProto['canActivate'];
    parentProto['canActivate'] = jest.fn().mockReturnValue(false);

    const result = guard.canActivate(ctx);
    expect(result).toBe(false);

    parentProto['canActivate'] = original;
  });
});
