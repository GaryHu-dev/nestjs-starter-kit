import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@/shared/enums';
import type { User } from '../../models/user.model';

/**
 * User profile response.
 *
 * Maps from the domain model so internal fields (e.g. soft-delete markers)
 * never leak into API responses.
 */
export class UserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ nullable: true, required: false })
  displayName!: string | null;

  @ApiProperty({ nullable: true, required: false })
  avatarUrl!: string | null;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static from(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
