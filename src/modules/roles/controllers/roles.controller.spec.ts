import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from '../services/roles.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { AuthProvider } from '@/shared/enums';
import { AUTH_TOKEN_TYPE } from '@/shared/constants';
import type { Role } from '../models/role.model';
import type { RequestUser } from '@/shared/types';

const mockRole = (): Role => ({
  id: 'role-1',
  code: 'admin',
  name: 'Admin',
  description: null,
  isSystem: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeService = () => ({
  findAll: jest.fn().mockResolvedValue([mockRole()]),
  findById: jest.fn().mockResolvedValue(mockRole()),
  create: jest.fn().mockResolvedValue(mockRole()),
  update: jest.fn().mockResolvedValue(mockRole()),
  remove: jest.fn().mockResolvedValue(undefined),
  assignPermission: jest.fn().mockResolvedValue(undefined),
  removePermission: jest.fn().mockResolvedValue(undefined),
  findPermissions: jest.fn().mockResolvedValue(['users:read']),
});

const mockUser: RequestUser = {
  sub: 'user-1',
  email: 'admin@example.com',
  provider: AuthProvider.LOCAL,
  type: AUTH_TOKEN_TYPE.ACCESS,
};

describe('RolesController', () => {
  let controller: RolesController;
  let service: ReturnType<typeof makeService>;

  beforeEach(async () => {
    service = makeService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [{ provide: RolesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(RolesController);
  });

  it('findAll returns roles array', async () => {
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
  });

  it('findOne returns a role', async () => {
    const result = await controller.findOne('role-1');
    expect(result.id).toBe('role-1');
    expect(service.findById).toHaveBeenCalledWith('role-1');
  });

  it('create returns new role', async () => {
    const dto = { code: 'admin', name: 'Admin' };
    const result = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result.code).toBe('admin');
  });

  it('update delegates to service', async () => {
    await controller.update('role-1', { name: 'Admin' });
    expect(service.update).toHaveBeenCalledWith('role-1', { name: 'Admin' });
  });

  it('remove delegates to service', async () => {
    await controller.remove('role-1');
    expect(service.remove).toHaveBeenCalledWith('role-1');
  });

  it('assignPermission delegates with current user sub', async () => {
    await controller.assignPermission('role-1', { permissionId: 'perm-1' }, mockUser);
    expect(service.assignPermission).toHaveBeenCalledWith('role-1', 'perm-1', mockUser.sub);
  });

  it('removePermission delegates to service', async () => {
    await controller.removePermission('role-1', 'perm-1');
    expect(service.removePermission).toHaveBeenCalledWith('role-1', 'perm-1');
  });

  it('findPermissions returns array of codes', async () => {
    const result = await controller.findPermissions('role-1');
    expect(result).toEqual(['users:read']);
    expect(service.findPermissions).toHaveBeenCalledWith('role-1');
  });
});
