import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Assign a permission to a role request.
 */
export class AssignPermissionDto {
  @ApiProperty()
  @IsUUID()
  permissionId!: string;
}
