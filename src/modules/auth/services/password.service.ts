import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly saltRounds: number;

  constructor(configService: ConfigService) {
    // Sourced from validated config (security.bcryptRounds) rather than reading
    // process.env directly, so the value passes through the Joi schema that
    // forces a safe minimum in production.
    this.saltRounds = configService.get<number>('security.bcryptRounds') ?? 12;
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Hash an arbitrary-length secret (e.g. a refresh JWT). bcrypt truncates its
   * input at 72 bytes, which would collapse per-user refresh tokens that share a
   * fixed-order header/payload prefix, so the token is first folded into a
   * 64-char SHA-256 hex digest (< 72 bytes) that captures its full entropy.
   */
  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(this.digest(token), this.saltRounds);
  }

  async compareToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(this.digest(token), hash);
  }

  private digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
