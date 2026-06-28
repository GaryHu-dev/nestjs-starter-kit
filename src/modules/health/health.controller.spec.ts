import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };
  let db: { pingCheck: jest.Mock };

  beforeEach(async () => {
    healthCheckService = { check: jest.fn() };
    db = { pingCheck: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: TypeOrmHealthIndicator, useValue: db },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  describe('check', () => {
    it('runs a database ping check and returns the result', async () => {
      const result = { status: 'ok', info: { database: { status: 'up' } } };
      healthCheckService.check.mockResolvedValue(result);

      await expect(controller.check()).resolves.toBe(result);
      expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);
    });

    it('wires the database indicator into the health check', async () => {
      healthCheckService.check.mockImplementation((indicators: Array<() => unknown>) => {
        indicators.forEach((indicator) => indicator());
        return Promise.resolve({ status: 'ok' });
      });

      await controller.check();
      expect(db.pingCheck).toHaveBeenCalledWith('database');
    });
  });
});
