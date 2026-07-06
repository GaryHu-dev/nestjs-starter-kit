import { QueryFailedError } from 'typeorm';

/** PostgreSQL SQLSTATE for a unique-constraint violation. */
export const PG_UNIQUE_VIOLATION = '23505';

/** PostgreSQL SQLSTATE for a foreign-key-constraint violation. */
export const PG_FOREIGN_KEY_VIOLATION = '23503';

function pgErrorCode(err: unknown): string | undefined {
  return err instanceof QueryFailedError
    ? (err as QueryFailedError & { code?: string }).code
    : undefined;
}

/**
 * Whether an error is a PostgreSQL unique-constraint violation.
 *
 * Centralises the driver-specific `code` check so the "insert, or recover if it
 * already exists" idempotency pattern reads the same everywhere.
 */
export function isUniqueViolation(err: unknown): boolean {
  return pgErrorCode(err) === PG_UNIQUE_VIOLATION;
}

/** Whether an error is a PostgreSQL foreign-key-constraint violation. */
export function isForeignKeyViolation(err: unknown): boolean {
  return pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION;
}
