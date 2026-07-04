import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { NormalizeEmail } from '@/shared/validators';

export class RequestEmailVerificationDto {
  @ApiProperty({ example: 'gary@example.com' })
  @NormalizeEmail()
  @IsEmail()
  email!: string;
}
