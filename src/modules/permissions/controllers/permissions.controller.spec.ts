import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from '../services/permissions.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import type { Permission } from '../models/permission.model';

const mockPermission = (): Permission => ({
  id: 'perm-1',
  code: 'users:read',
  name: 'Read Users',
  description: null,
  isSystem: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeService = () => ({
  findAll: jest.fn().mockResolvedValue([mockPermission()]),
  findById: jest.fn().mockResolvedValue(mockPermission()),
  create: jest.fn().mockResolvedValue(mockPermission()),
  update: jest.fn().mockResolvedValue(mockPermission()),
  remove: jest.fn().mockResolvedValue(undefined),
});

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let service: ReturnType<typeof makeService>;

  beforeEach(async () => {
    service = makeService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [{ provide: PermissionsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PermissionsController);
  });

  it('findAll returns permissions', async () => {
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
  });

  it('findOne returns a permission', async () => {
    const result = await controller.findOne('perm-1');
    expect(result.id).toBe('perm-1');
  });

  it('create delegates to service', async () => {
    const dto = { code: 'users:read', name: 'Read Users' };
    const result = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result.code).toBe('users:read');
  });

  it('update delegates to service', async () => {
    await controller.update('perm-1', { name: 'Updated' });
    expect(service.update).toHaveBeenCalledWith('perm-1', { name: 'Updated' });
  });

  it('remove delegates to service', async () => {
    await controller.remove('perm-1');
    expect(service.remove).toHaveBeenCalledWith('perm-1');
  });
});
