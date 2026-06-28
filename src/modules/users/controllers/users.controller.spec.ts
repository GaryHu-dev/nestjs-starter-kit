import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { UserStatus } from '@/shared/enums';
import type { RequestUser } from '@/shared/types';
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

const paginated = {
  items: [mockUser()],
  pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
};

const makeService = () => ({
  findAll: jest.fn().mockResolvedValue(paginated),
  findById: jest.fn().mockResolvedValue(mockUser()),
  updateProfile: jest.fn().mockResolvedValue(mockUser()),
  remove: jest.fn().mockResolvedValue(undefined),
});

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: ReturnType<typeof makeService>;

  beforeEach(async () => {
    usersService = makeService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(UsersController);
  });

  it('findAll delegates to service with defaults', async () => {
    const result = await controller.findAll({ page: 1, pageSize: 20 });
    expect(usersService.findAll).toHaveBeenCalledWith(1, 20);
    expect(result.items).toHaveLength(1);
  });

  it('findAll uses query defaults when params are undefined', async () => {
    await controller.findAll({});
    expect(usersService.findAll).toHaveBeenCalledWith(1, 20);
  });

  it('findOne delegates to service', async () => {
    const result = await controller.findOne('user-1');
    expect(usersService.findById).toHaveBeenCalledWith('user-1');
    expect(result.id).toBe('user-1');
  });

  it('update delegates to service', async () => {
    const dto = { firstName: 'Updated' };
    await controller.update('user-1', dto);
    expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', dto);
  });

  it('remove delegates to service with the requesting user id', async () => {
    await controller.remove('victim-1', { sub: 'admin-1' } as RequestUser);
    expect(usersService.remove).toHaveBeenCalledWith('victim-1', 'admin-1');
  });
});
