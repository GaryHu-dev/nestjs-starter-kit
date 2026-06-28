import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

const makeHost = (statusFn: jest.Mock, jsonFn: jest.Mock): ArgumentsHost =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => ({
        status: statusFn.mockReturnValue({ json: jsonFn }),
      }),
    }),
  }) as unknown as ArgumentsHost;

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    // Suppress the filter's internal error logging during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    filter = new AllExceptionsFilter();
    statusMock = jest.fn();
    jsonMock = jest.fn();
    host = makeHost(statusMock, jsonMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 with message for HttpException', () => {
    const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    filter.catch(exception, host);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 400, message: 'Bad Request' }),
    );
  });

  it('returns 500 for non-HTTP exceptions and logs them', () => {
    const error = new Error('Something broke');
    filter.catch(error, host);
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 500 }),
    );
  });

  it('handles string exceptions', () => {
    filter.catch('plain error string', host);
    expect(statusMock).toHaveBeenCalledWith(500);
  });

  it('extracts message array from validation HttpException', () => {
    const exception = new HttpException(
      { message: ['email must be an email', 'password is too short'] },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    filter.catch(exception, host);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: ['email must be an email', 'password is too short'],
      }),
    );
  });

  it('data field is always null', () => {
    filter.catch(new HttpException('X', 400), host);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ data: null }));
  });

  it('falls back to "Internal server error" when HttpException body has no message key', () => {
    // Response body is an object without a 'message' property → falls back to default
    const exception = new HttpException({ error: 'Custom error object' }, HttpStatus.BAD_REQUEST);
    filter.catch(exception, host);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });
});
