import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePermissionDto } from './create-permission.dto';

/**
 * Update permission request.
 *
 * All fields are optional. `code` is immutable once created because it is the
 * stable identifier referenced by role assignments and JWT claims.
 */
export class UpdatePermissionDto extends PartialType(
  OmitType(CreatePermissionDto, ['code'] as const),
) {}
