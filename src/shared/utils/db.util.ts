import { QueryFailedError } from 'typeorm';

/** PostgreSQL SQLSTATE for a unique-constraint violation. */
export const PG_UNIQUE_VIOLATION = '23505';

/**
 * Whether an error is a PostgreSQL unique-constraint violation.
 *
 * Centralises the driver-specific `code` check so the "insert, or recover if it
 * already exists" idempotency pattern reads the same everywhere.
 */
export function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err as QueryFailedError & { code?: string }).code === PG_UNIQUE_VIOLATION
  );
}
