import { Test, TestingModule } from '@nestjs/testing';
import { IdentitiesService } from './identities.service';
import { IdentityRepository } from '../repositories/identity.repository';
import { AuthProvider } from '@/shared/enums';
import type { Identity } from '../models/identity.model';

const mockIdentity = (): Identity => ({
  id: 'id-1',
  userId: 'user-1',
  provider: AuthProvider.LOCAL,
  providerUserId: 'user@example.com',
  expiresAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeIdentityRepo = () => ({
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByUserIdAndProvider: jest.fn(),
  findByProvider: jest.fn(),
});

describe('IdentitiesService', () => {
  let service: IdentitiesService;
  let identityRepo: ReturnType<typeof makeIdentityRepo>;

  beforeEach(async () => {
    identityRepo = makeIdentityRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [IdentitiesService, { provide: IdentityRepository, useValue: identityRepo }],
    }).compile();

    service = module.get(IdentitiesService);
  });

  describe('findByUserId', () => {
    it('returns identities for a user', async () => {
      identityRepo.findByUserId.mockResolvedValue([mockIdentity()]);
      const result = await service.findByUserId('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe(AuthProvider.LOCAL);
    });

    it('returns empty array when no identities found', async () => {
      identityRepo.findByUserId.mockResolvedValue([]);
      const result = await service.findByUserId('user-1');
      expect(result).toEqual([]);
    });
  });
});
