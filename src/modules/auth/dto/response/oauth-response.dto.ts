import { ApiProperty } from '@nestjs/swagger';
import { AuthTokenDto } from './auth-token.dto';

/**
 * OAuth callback response.
 *
 * Returned directly from the OAuth callback endpoints so that
 * API clients can extract tokens without parsing redirects.
 */
export class OAuthResponseDto {
  @ApiProperty({ type: AuthTokenDto })
  tokens!: AuthTokenDto;
}
