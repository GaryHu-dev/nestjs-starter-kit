import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from '@/shared/enums';
import type { Identity } from '../../models/identity.model';

/**
 * Identity response. Built via `from()` so provider-internal fields (userId,
 * providerUserId) on the domain model never leak into API responses.
 */
export class IdentityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AuthProvider })
  provider!: AuthProvider;

  @ApiProperty({ nullable: true, required: false })
  expiresAt!: Date | null;

  @ApiProperty({ nullable: true, required: false })
  lastLoginAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  static from(identity: Identity): IdentityDto {
    return {
      id: identity.id,
      provider: identity.provider,
      expiresAt: identity.expiresAt,
      lastLoginAt: identity.lastLoginAt,
      createdAt: identity.createdAt,
    };
  }
}
