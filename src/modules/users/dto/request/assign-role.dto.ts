import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ format: 'uuid', description: 'ID of the role to grant to the user.' })
  @IsUUID()
  roleId!: string;
}
