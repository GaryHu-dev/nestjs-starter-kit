import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '@/shared/validators';

export class LoginDto {
  @ApiProperty({
    example: 'gary@example.com',
  })
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password@123',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}
