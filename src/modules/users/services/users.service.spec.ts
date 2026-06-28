import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UserRepository } from '../repositories/user.repository';
import { UserStatus } from '@/shared/enums';
import type { User } from '../models/user.model';

const mockUser = (): User => ({
  id: 'user-1',
  email: 'gary@example.com',
  firstName: 'Gary',
  lastName: 'Hu',
  displayName: null,
  avatarUrl: null,
  emailVerified: false,
  status: UserStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});

const makeUserRepo = () => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: ReturnType<typeof makeUserRepo>;

  beforeEach(async () => {
    userRepo = makeUserRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: UserRepository, useValue: userRepo }],
    }).compile();

    service = module.get(UsersService);
  });

  describe('findById', () => {
    it('returns the user when found', async () => {
      userRepo.findById.mockResolvedValue(mockUser());
      const result = await service.findById('user-1');
      expect(result.id).toBe('user-1');
    });

    it('throws NotFoundException when user not found', async () => {
      userRepo.findById.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      userRepo.findByEmail.mockResolvedValue(mockUser());
      const result = await service.findByEmail('gary@example.com');
      expect(result?.email).toBe('gary@example.com');
    });

    it('returns null when not found', async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      expect(await service.findByEmail('missing@example.com')).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns paginated results', async () => {
      const users = [mockUser(), mockUser()];
      userRepo.findAll.mockResolvedValue([users, 2]);

      const result = await service.findAll(1, 20);
      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });

    it('calculates totalPages correctly', async () => {
      userRepo.findAll.mockResolvedValue([[], 45]);
      const result = await service.findAll(1, 20);
      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe('updateProfile', () => {
    it('delegates to repository', async () => {
      const updated = { ...mockUser(), firstName: 'Updated' };
      userRepo.update.mockResolvedValue(updated);

      const result = await service.updateProfile('user-1', { firstName: 'Updated' });
      expect(result.firstName).toBe('Updated');
      expect(userRepo.update).toHaveBeenCalledWith('user-1', { firstName: 'Updated' });
    });
  });

  describe('remove', () => {
    it('soft-deletes the user', async () => {
      userRepo.findById.mockResolvedValue(mockUser());
      userRepo.softDelete.mockResolvedValue(undefined);

      await service.remove('user-1', 'admin-1');
      expect(userRepo.softDelete).toHaveBeenCalledWith('user-1');
    });

    it('throws ForbiddenException when deleting your own account', async () => {
      await expect(service.remove('user-1', 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(userRepo.softDelete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user not found', async () => {
      userRepo.findById.mockResolvedValue(null);
      await expect(service.remove('missing', 'admin-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
