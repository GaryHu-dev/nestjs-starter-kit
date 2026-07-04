import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * Provides the AuditService application-wide.
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
