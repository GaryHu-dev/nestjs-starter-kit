import { Injectable, Logger } from '@nestjs/common';

/**
 * Security-relevant events worth an audit trail (authentication lifecycle and
 * privilege changes). Extend as new sensitive operations are added.
 */
export type AuditEvent =
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.logout'
  | 'auth.password_changed'
  | 'auth.email_verified'
  | 'rbac.role_assigned'
  | 'rbac.role_removed';

export interface AuditDetails {
  /** The user who performed the action, when known. */
  actorId?: string;
  /** The user/entity the action targeted, when different from the actor. */
  targetId?: string;
  /** Free-form, non-sensitive context (never credentials). */
  [key: string]: unknown;
}

/**
 * Emits a structured, append-only audit trail through the application logger.
 *
 * Entries are tagged `audit: true` so log pipelines can route them to a
 * dedicated, tamper-evident sink (SIEM, immutable store) for compliance
 * (e.g. APRA CPS 234). Kept deliberately transport-agnostic: swap the sink at
 * the logging layer without touching call sites.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  record(event: AuditEvent, details: AuditDetails = {}): void {
    this.logger.log({ audit: true, event, ...details });
  }
}
