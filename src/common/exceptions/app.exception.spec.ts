import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

describe('AppException', () => {
  it('defaults to 500 status when no status code provided', () => {
    const ex = new AppException('Something went wrong');
    expect(ex.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(ex.message).toBe('Something went wrong');
  });

  it('uses the provided status code', () => {
    const ex = new AppException('Not found', HttpStatus.NOT_FOUND);
    expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
  });

  it('is an instance of Error', () => {
    expect(new AppException('oops')).toBeInstanceOf(Error);
  });
});
