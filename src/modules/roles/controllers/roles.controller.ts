import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { appConfig } from '@/config/app.config';
import { ParseUuidPipe } from '@/common/pipes';
import { CurrentUser, Roles } from '@/modules/auth/decorators';
import { RoleName } from '@/shared/enums';
import type { RequestUser } from '@/shared/types';
import { AssignPermissionDto, CreateRoleDto, UpdateRoleDto } from '../dto/request';
import { RoleDto } from '../dto/response';
import { RolesService } from '../services/roles.service';

@ApiTags('Roles')
@ApiBearerAuth(appConfig.swaggerSecurityScheme)
@Roles(RoleName.SUPER_ADMIN)
@Controller({
  path: 'roles',
  version: appConfig.apiVersion,
})
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles.' })
  @ApiOkResponse({ type: RoleDto, isArray: true })
  async findAll(): Promise<RoleDto[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a role by ID.' })
  @ApiOkResponse({ type: RoleDto })
  async findOne(@Param('id', ParseUuidPipe) id: string): Promise<RoleDto> {
    return this.rolesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new role.' })
  @ApiCreatedResponse({ type: RoleDto })
  async create(@Body() dto: CreateRoleDto): Promise<RoleDto> {
    return this.rolesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a role.' })
  @ApiOkResponse({ type: RoleDto })
  async update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleDto> {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role.' })
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUuidPipe) id: string): Promise<void> {
    await this.rolesService.remove(id);
  }

  @Post(':id/permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Assign a permission to a role.' })
  @ApiNoContentResponse()
  async assignPermission(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: AssignPermissionDto,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.rolesService.assignPermission(id, dto.permissionId, user.sub);
  }

  @Delete(':id/permissions/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a permission from a role.' })
  @ApiNoContentResponse()
  async removePermission(
    @Param('id', ParseUuidPipe) id: string,
    @Param('permissionId', ParseUuidPipe) permissionId: string,
  ): Promise<void> {
    await this.rolesService.removePermission(id, permissionId);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'List permissions assigned to a role.' })
  @ApiOkResponse({ type: String, isArray: true })
  async findPermissions(@Param('id', ParseUuidPipe) id: string): Promise<string[]> {
    return this.rolesService.findPermissions(id);
  }
}
