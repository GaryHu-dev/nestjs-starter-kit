import { ApiProperty } from '@nestjs/swagger';
import type { Role } from '../../models/role.model';

/**
 * Role response. Built via `from()` so only whitelisted fields are ever
 * serialised, even if the domain model later grows internal fields.
 */
export class RoleDto {
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

  static from(role: Role): RoleDto {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
