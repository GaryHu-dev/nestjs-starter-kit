import { randomUUID } from 'crypto';

/**
 * Safe shape for a client-supplied request id: printable, bounded, no control
 * characters or newlines.
 */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Resolve a trustworthy request id.
 *
 * A client-supplied `X-Request-ID` is echoed into logs and responses, so it is
 * only accepted when it matches a strict allowlist — otherwise it is a log- and
 * trace-injection vector. Anything unsafe (or absent) is replaced with a fresh
 * UUID.
 */
export function resolveRequestId(candidate: string | string[] | undefined): string {
  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  return value !== undefined && SAFE_REQUEST_ID.test(value) ? value : randomUUID();
}
