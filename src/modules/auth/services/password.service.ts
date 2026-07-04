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
}
