import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '@/shared/validators';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  currentPassword!: string;

  @ApiProperty({
    description: 'Min 8 chars, uppercase, lowercase, digit, and special character.',
  })
  @IsString()
  @MaxLength(100)
  @IsStrongPassword()
  newPassword!: string;
}
