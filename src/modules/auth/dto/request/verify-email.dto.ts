import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'The verification token from the emailed link.' })
  @IsJWT()
  token!: string;
}
