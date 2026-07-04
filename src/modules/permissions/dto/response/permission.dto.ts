import { ApiProperty } from '@nestjs/swagger';
import type { Permission } from '../../models/permission.model';

/**
 * Permission response. Built via `from()` so only whitelisted fields are ever
 * serialised, even if the domain model later grows internal fields.
 */
export class PermissionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true, required: false })
  description!: string | null;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static from(permission: Permission): PermissionDto {
    return {
      id: permission.id,
      code: permission.code,
      name: permission.name,
      description: permission.description,
      isSystem: permission.isSystem,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }
}
