import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from '@/shared/enums';
import type { AuthUserView } from '../../repositories/auth.repository';
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

  static from(tokens: AuthTokenDto, user: AuthUserView, provider: AuthProvider): LoginResponseDto {
    return {
      tokens,
      user: ProfileDto.from(user, provider),
    };
  }
}
