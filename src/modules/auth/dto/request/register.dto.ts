import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '@/shared/validators';

export class RegisterDto {
  @ApiProperty({
    example: 'Gary',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({
    example: 'Hu',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({
    example: 'gary@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Min 8 chars, uppercase, lowercase, digit, and special character.',
  })
  @IsString()
  @MaxLength(100)
  @IsStrongPassword()
  password!: string;
}
