import { Logger } from '@nestjs/common';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('emits a tagged structured entry', () => {
    const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const service = new AuditService();

    service.record('auth.login.success', { actorId: 'user-1' });

    expect(spy).toHaveBeenCalledWith({
      audit: true,
      event: 'auth.login.success',
      actorId: 'user-1',
    });
    spy.mockRestore();
  });

  it('works with no details', () => {
    const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    new AuditService().record('auth.logout');
    expect(spy).toHaveBeenCalledWith({ audit: true, event: 'auth.logout' });
    spy.mockRestore();
  });
});
