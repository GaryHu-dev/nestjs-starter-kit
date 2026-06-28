import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { RoleRepository } from '../repositories/role.repository';
import type { Role } from '../models/role.model';

const mockRole = (overrides: Partial<Role> = {}): Role => ({
  id: 'role-1',
  code: 'editor',
  name: 'Editor',
  description: 'Editor role',
  isSystem: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeRoleRepo = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByCode: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  assignPermission: jest.fn(),
  removePermission: jest.fn(),
  findPermissionCodesByRoleId: jest.fn(),
});

describe('RolesService', () => {
  let service: RolesService;
  let roleRepo: ReturnType<typeof makeRoleRepo>;

  beforeEach(async () => {
    roleRepo = makeRoleRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesService, { provide: RoleRepository, useValue: roleRepo }],
    }).compile();

    service = module.get(RolesService);
  });

  describe('findAll', () => {
    it('returns all roles', async () => {
      roleRepo.findAll.mockResolvedValue([mockRole()]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('returns the role', async () => {
      roleRepo.findById.mockResolvedValue(mockRole());
      const result = await service.findById('role-1');
      expect(result.id).toBe('role-1');
    });

    it('throws NotFoundException when not found', async () => {
      roleRepo.findById.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a role and never trusts a client-supplied isSystem flag', async () => {
      roleRepo.findByCode.mockResolvedValue(null);
      roleRepo.create.mockResolvedValue(mockRole());

      const result = await service.create({ code: 'editor', name: 'Editor' });

      expect(result.code).toBe('editor');
      expect(roleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: null, isSystem: false }),
      );
    });

    it('throws ConflictException when the code already exists', async () => {
      roleRepo.findByCode.mockResolvedValue(mockRole());
      await expect(service.create({ code: 'editor', name: 'Editor' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(roleRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates only the provided fields', async () => {
      roleRepo.findById.mockResolvedValue(mockRole());
      roleRepo.update.mockResolvedValue(mockRole({ name: 'Senior Editor' }));

      const result = await service.update('role-1', { name: 'Senior Editor' });

      expect(result.name).toBe('Senior Editor');
      expect(roleRepo.update).toHaveBeenCalledWith('role-1', { name: 'Senior Editor' });
    });

    it('does not clobber description when not provided', async () => {
      roleRepo.findById.mockResolvedValue(mockRole());
      roleRepo.update.mockResolvedValue(mockRole());

      await service.update('role-1', { name: 'New Name' });
      expect(roleRepo.update).toHaveBeenCalledWith(
        'role-1',
        expect.not.objectContaining({ description: null }),
      );
    });

    it('throws ForbiddenException when modifying a system role', async () => {
      roleRepo.findById.mockResolvedValue(mockRole({ isSystem: true }));
      await expect(service.update('role-1', { name: 'X' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(roleRepo.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when role not found', async () => {
      roleRepo.findById.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes the role', async () => {
      roleRepo.findById.mockResolvedValue(mockRole());
      roleRepo.delete.mockResolvedValue(undefined);

      await service.remove('role-1');
      expect(roleRepo.delete).toHaveBeenCalledWith('role-1');
    });

    it('throws ForbiddenException when deleting a system role', async () => {
      roleRepo.findById.mockResolvedValue(mockRole({ isSystem: true }));
      await expect(service.remove('role-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(roleRepo.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when not found', async () => {
      roleRepo.findById.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('assignPermission', () => {
    it('delegates to roleRepository', async () => {
      roleRepo.assignPermission.mockResolvedValue(undefined);
      await service.assignPermission('role-1', 'perm-1', 'user-1');
      expect(roleRepo.assignPermission).toHaveBeenCalledWith('role-1', 'perm-1', 'user-1');
    });
  });

  describe('removePermission', () => {
    it('verifies the role exists then delegates', async () => {
      roleRepo.findById.mockResolvedValue(mockRole());
      roleRepo.removePermission.mockResolvedValue(undefined);

      await service.removePermission('role-1', 'perm-1');
      expect(roleRepo.removePermission).toHaveBeenCalledWith('role-1', 'perm-1');
    });

    it('throws NotFoundException when the role does not exist', async () => {
      roleRepo.findById.mockResolvedValue(null);
      await expect(service.removePermission('missing', 'perm-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(roleRepo.removePermission).not.toHaveBeenCalled();
    });
  });

  describe('findPermissions', () => {
    it('returns permission codes for the role', async () => {
      roleRepo.findById.mockResolvedValue(mockRole());
      roleRepo.findPermissionCodesByRoleId.mockResolvedValue(['users:read', 'users:write']);
      const result = await service.findPermissions('role-1');
      expect(result).toEqual(['users:read', 'users:write']);
    });

    it('throws NotFoundException when role not found', async () => {
      roleRepo.findById.mockResolvedValue(null);
      await expect(service.findPermissions('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
