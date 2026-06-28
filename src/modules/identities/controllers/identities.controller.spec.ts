import { Test, TestingModule } from '@nestjs/testing';
import { IdentitiesController } from './identities.controller';
import { IdentitiesService } from '../services/identities.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AuthProvider } from '@/shared/enums';
import { AUTH_TOKEN_TYPE } from '@/shared/constants';
import type { Identity } from '../models/identity.model';
import type { RequestUser } from '@/shared/types';

const mockIdentity = (): Identity => ({
  id: 'id-1',
  userId: 'user-1',
  provider: AuthProvider.LOCAL,
  providerUserId: 'user@example.com',
  expiresAt: null,
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeService = () => ({
  findByUserId: jest.fn().mockResolvedValue([mockIdentity()]),
});

const mockUser: RequestUser = {
  sub: 'user-1',
  email: 'user@example.com',
  provider: AuthProvider.LOCAL,
  type: AUTH_TOKEN_TYPE.ACCESS,
};

describe('IdentitiesController', () => {
  let controller: IdentitiesController;
  let service: ReturnType<typeof makeService>;

  beforeEach(async () => {
    service = makeService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentitiesController],
      providers: [{ provide: IdentitiesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(IdentitiesController);
  });

  it('findMyIdentities returns the current user identities', async () => {
    const result = await controller.findMyIdentities(mockUser);
    expect(service.findByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe(AuthProvider.LOCAL);
  });

  it('maps identity to IdentityDto shape (no userId exposed)', async () => {
    const result = await controller.findMyIdentities(mockUser);
    const dto = result[0];
    expect(dto).toHaveProperty('id');
    expect(dto).toHaveProperty('provider');
    expect(dto).not.toHaveProperty('userId');
  });
});
