import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Create role request.
 *
 * `isSystem` is intentionally not accepted from clients — system roles are
 * created only by seeding/migrations so they cannot be forged or deleted.
 */
export class CreateRoleDto {
  @ApiProperty({ example: 'content-editor' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  code!: string;

  @ApiProperty({ example: 'Content Editor' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}
