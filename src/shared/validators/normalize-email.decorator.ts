import { Transform } from 'class-transformer';

/**
 * Normalise an email to a canonical form (trimmed, lower-cased) before
 * validation and persistence.
 *
 * Prevents case/whitespace variants of the same address from creating parallel
 * accounts or side-stepping the per-account login lockout.
 */
export const NormalizeEmail = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
