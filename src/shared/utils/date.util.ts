/**
 * Returns the current UTC date-time as an ISO 8601 string.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Adds the given number of seconds to a date and returns the result.
 */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

/**
 * Returns true when the given date is in the past.
 */
export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}
