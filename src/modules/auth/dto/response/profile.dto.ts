import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider, UserStatus } from '@/shared/enums';

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
}
