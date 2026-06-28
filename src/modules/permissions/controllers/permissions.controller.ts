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
import { Roles } from '@/modules/auth/decorators';
import { RoleName } from '@/shared/enums';
import { CreatePermissionDto, UpdatePermissionDto } from '../dto/request';
import { PermissionDto } from '../dto/response';
import { PermissionsService } from '../services/permissions.service';

@ApiTags('Permissions')
@ApiBearerAuth(appConfig.swaggerSecurityScheme)
@Roles(RoleName.SUPER_ADMIN)
@Controller({
  path: 'permissions',
  version: appConfig.apiVersion,
})
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all permissions.' })
  @ApiOkResponse({ type: PermissionDto, isArray: true })
  async findAll(): Promise<PermissionDto[]> {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a permission by ID.' })
  @ApiOkResponse({ type: PermissionDto })
  async findOne(@Param('id', ParseUuidPipe) id: string): Promise<PermissionDto> {
    return this.permissionsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new permission.' })
  @ApiCreatedResponse({ type: PermissionDto })
  async create(@Body() dto: CreatePermissionDto): Promise<PermissionDto> {
    return this.permissionsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a permission.' })
  @ApiOkResponse({ type: PermissionDto })
  async update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ): Promise<PermissionDto> {
    return this.permissionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a permission.' })
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUuidPipe) id: string): Promise<void> {
    await this.permissionsService.remove(id);
  }
}
