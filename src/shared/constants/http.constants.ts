/**
 * Common HTTP header names.
 */
export const HTTP_HEADER = {
  AUTHORIZATION: 'Authorization',
  CONTENT_TYPE: 'Content-Type',
  X_REQUEST_ID: 'X-Request-ID',
  X_CORRELATION_ID: 'X-Correlation-ID',
} as const;

export type HttpHeader = (typeof HTTP_HEADER)[keyof typeof HTTP_HEADER];

/**
 * Common MIME types.
 */
export const MIME_TYPE = {
  JSON: 'application/json',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
} as const;

export type MimeType = (typeof MIME_TYPE)[keyof typeof MIME_TYPE];
