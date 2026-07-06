import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider, UserStatus } from '@/shared/enums';
import type { AuthUserView } from '../../repositories/auth.repository';

export class ProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  displayName?: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  avatarUrl?: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({
    enum: UserStatus,
  })
  status!: UserStatus;

  @ApiProperty({
    enum: AuthProvider,
  })
  provider!: AuthProvider;

  /**
   * Map the account view to a profile response, whitelisting only the fields
   * declared above so internal columns can never be serialised. `provider` is
   * session-scoped (it belongs to the identity used to authenticate), so it is
   * passed in rather than read off the user.
   */
  static from(user: AuthUserView, provider: AuthProvider): ProfileDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      emailVerified: user.emailVerified,
      status: user.status,
      provider,
    };
  }
}
