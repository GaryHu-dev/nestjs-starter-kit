import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from '@/shared/enums';

/**
 * Identity response.
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
}
