import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { PermissionRepository } from '../repositories/permission.repository';
import type { Permission } from '../models/permission.model';

const mockPermission = (overrides: Partial<Permission> = {}): Permission => ({
  id: 'perm-1',
  code: 'users:read',
  name: 'Read Users',
  description: null,
  isSystem: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makePermissionRepo = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByCode: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionRepo: ReturnType<typeof makePermissionRepo>;

  beforeEach(async () => {
    permissionRepo = makePermissionRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionsService, { provide: PermissionRepository, useValue: permissionRepo }],
    }).compile();

    service = module.get(PermissionsService);
  });

  describe('findAll', () => {
    it('returns all permissions', async () => {
      permissionRepo.findAll.mockResolvedValue([mockPermission()]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('returns the permission', async () => {
      permissionRepo.findById.mockResolvedValue(mockPermission());
      const result = await service.findById('perm-1');
      expect(result.id).toBe('perm-1');
    });

    it('throws NotFoundException when not found', async () => {
      permissionRepo.findById.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a permission with a server-controlled isSystem flag', async () => {
      permissionRepo.findByCode.mockResolvedValue(null);
      permissionRepo.create.mockResolvedValue(mockPermission());

      const result = await service.create({ code: 'users:read', name: 'Read Users' });

      expect(result.code).toBe('users:read');
      expect(permissionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isSystem: false, description: null }),
      );
    });

    it('throws ConflictException when the code already exists', async () => {
      permissionRepo.findByCode.mockResolvedValue(mockPermission());
      await expect(
        service.create({ code: 'users:read', name: 'Read Users' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(permissionRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates only the provided fields', async () => {
      permissionRepo.findById.mockResolvedValue(mockPermission());
      permissionRepo.update.mockResolvedValue(mockPermission({ name: 'Write Users' }));

      const result = await service.update('perm-1', { name: 'Write Users' });

      expect(result.name).toBe('Write Users');
      expect(permissionRepo.update).toHaveBeenCalledWith('perm-1', { name: 'Write Users' });
    });

    it('does not clobber description when not provided in partial update', async () => {
      permissionRepo.findById.mockResolvedValue(mockPermission());
      permissionRepo.update.mockResolvedValue(mockPermission());

      await service.update('perm-1', { name: 'New Name' });
      expect(permissionRepo.update).toHaveBeenCalledWith(
        'perm-1',
        expect.not.objectContaining({ description: null }),
      );
    });

    it('throws ForbiddenException when modifying a system permission', async () => {
      permissionRepo.findById.mockResolvedValue(mockPermission({ isSystem: true }));
      await expect(service.update('perm-1', { name: 'X' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(permissionRepo.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when not found', async () => {
      permissionRepo.findById.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes the permission', async () => {
      permissionRepo.findById.mockResolvedValue(mockPermission());
      permissionRepo.delete.mockResolvedValue(undefined);

      await service.remove('perm-1');
      expect(permissionRepo.delete).toHaveBeenCalledWith('perm-1');
    });

    it('throws ForbiddenException when deleting a system permission', async () => {
      permissionRepo.findById.mockResolvedValue(mockPermission({ isSystem: true }));
      await expect(service.remove('perm-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(permissionRepo.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when not found', async () => {
      permissionRepo.findById.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
