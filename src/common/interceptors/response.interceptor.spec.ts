import { of } from 'rxjs';
import { ExecutionContext, CallHandler, StreamableFile } from '@nestjs/common';
import { ApiResponse } from '@/shared/types/api-response.type';
import { ResponseInterceptor } from './response.interceptor';

const makeContext = (statusCode = 200, requestId = 'req-1'): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
      getRequest: () => ({ id: requestId }),
    }),
  }) as unknown as ExecutionContext;

const makeHandler = (data: unknown): CallHandler => ({
  handle: () => of(data),
});

const asEnvelope = <T>(result: ApiResponse<T> | T): ApiResponse<T> => result as ApiResponse<T>;

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('wraps the response in ApiResponse shape', (done) => {
    const ctx = makeContext(200);
    const next = makeHandler({ id: 'user-1' });

    interceptor.intercept(ctx, next).subscribe((result) => {
      const envelope = asEnvelope(result);
      expect(envelope.success).toBe(true);
      expect(envelope.statusCode).toBe(200);
      expect(envelope.message).toBe('Success');
      expect(envelope.data).toEqual({ id: 'user-1' });
      done();
    });
  });

  it('includes correlation metadata', (done) => {
    const ctx = makeContext(200, 'trace-123');
    const next = makeHandler({ id: 'user-1' });

    interceptor.intercept(ctx, next).subscribe((result) => {
      const envelope = asEnvelope(result);
      expect(envelope.meta?.traceId).toBe('trace-123');
      expect(envelope.meta?.timestamp).toEqual(expect.any(String));
      done();
    });
  });

  it('wraps null data correctly', (done) => {
    const ctx = makeContext(204);
    const next = makeHandler(null);

    interceptor.intercept(ctx, next).subscribe((result) => {
      const envelope = asEnvelope(result);
      expect(envelope.success).toBe(true);
      expect(envelope.data).toBeNull();
      done();
    });
  });

  it('wraps array data', (done) => {
    const ctx = makeContext(200);
    const next = makeHandler([1, 2, 3]);

    interceptor.intercept(ctx, next).subscribe((result) => {
      expect(asEnvelope(result).data).toEqual([1, 2, 3]);
      done();
    });
  });

  it('reflects the response status code', (done) => {
    const ctx = makeContext(201);
    const next = makeHandler({ id: 'new' });

    interceptor.intercept(ctx, next).subscribe((result) => {
      expect(asEnvelope(result).statusCode).toBe(201);
      done();
    });
  });

  it('passes StreamableFile responses through unwrapped', (done) => {
    const ctx = makeContext(200);
    const file = new StreamableFile(Buffer.from('binary'));
    const next = makeHandler(file);

    interceptor.intercept(ctx, next).subscribe((result) => {
      expect(result).toBe(file);
      done();
    });
  });
});
