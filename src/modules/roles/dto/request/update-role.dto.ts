import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/**
 * Update role request.
 *
 * All fields are optional. `code` is immutable once created because it is the
 * stable identifier referenced by permission assignments.
 */
export class UpdateRoleDto extends PartialType(OmitType(CreateRoleDto, ['code'] as const)) {}
