import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  // Lower rounds in test environment so bcrypt doesn't slow suites down
  private static readonly SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, PasswordService.SALT_ROUNDS);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
