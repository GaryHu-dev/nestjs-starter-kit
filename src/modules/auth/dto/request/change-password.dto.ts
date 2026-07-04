import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/shared/constants';
import { IsStrongPassword } from '@/shared/validators';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @ApiProperty({
    description: 'Min 8 chars, uppercase, lowercase, digit, and special character.',
  })
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  @IsStrongPassword()
  newPassword!: string;
}
