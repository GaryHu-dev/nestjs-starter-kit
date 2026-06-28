import { ApiProperty } from '@nestjs/swagger';
import { AuthTokenDto } from './auth-token.dto';
import { ProfileDto } from './profile.dto';

export class LoginResponseDto {
  @ApiProperty({
    type: AuthTokenDto,
  })
  tokens!: AuthTokenDto;

  @ApiProperty({
    type: ProfileDto,
  })
  user!: ProfileDto;
}
