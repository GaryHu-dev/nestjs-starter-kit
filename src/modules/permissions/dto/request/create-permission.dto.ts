import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Create permission request.
 *
 * `isSystem` is intentionally not accepted from clients — system permissions
 * are created only by seeding/migrations so they cannot be forged or deleted.
 */
export class CreatePermissionDto {
  @ApiProperty({ example: 'users:read' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  code!: string;

  @ApiProperty({ example: 'Read Users' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}
