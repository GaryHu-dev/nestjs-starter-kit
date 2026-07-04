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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { appConfig } from '@/config/app.config';
import { ParseUuidPipe } from '@/common/pipes';
import { CurrentUser, Roles } from '@/modules/auth/decorators';
import { RoleName } from '@/shared/enums';
import type { Paginated, RequestUser } from '@/shared/types';
import { AssignRoleDto, FindUsersQueryDto, UpdateUserDto } from '../dto/request';
import { UserDto } from '../dto/response';
import { UsersService } from '../services/users.service';

@ApiTags('Users')
@ApiBearerAuth(appConfig.swaggerSecurityScheme)
@Controller({
  path: 'users',
  version: appConfig.apiVersion,
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all users.' })
  @ApiOkResponse({ type: UserDto, isArray: true })
  async findAll(@Query() query: FindUsersQueryDto): Promise<Paginated<UserDto>> {
    const result = await this.usersService.findAll(query.page ?? 1, query.pageSize ?? 20);
    return { ...result, items: result.items.map((user) => UserDto.from(user)) };
  }

  @Get(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a user by ID.' })
  @ApiOkResponse({ type: UserDto })
  async findOne(@Param('id', ParseUuidPipe) id: string): Promise<UserDto> {
    return UserDto.from(await this.usersService.findById(id));
  }

  @Put(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a user profile.' })
  @ApiOkResponse({ type: UserDto })
  async update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDto> {
    return UserDto.from(await this.usersService.updateProfile(id, dto));
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user.' })
  @ApiNoContentResponse()
  async remove(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.usersService.remove(id, user.sub);
  }

  @Get(':id/roles')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'List the role codes granted to a user.' })
  @ApiOkResponse({ type: String, isArray: true })
  async findRoles(@Param('id', ParseUuidPipe) id: string): Promise<string[]> {
    return this.usersService.findRoles(id);
  }

  @Post(':id/roles')
  @Roles(RoleName.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant a role to a user. Returns the updated role list.' })
  @ApiOkResponse({ type: String, isArray: true })
  async assignRole(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<string[]> {
    return this.usersService.assignRole(id, dto.roleId, actor.sub);
  }

  @Delete(':id/roles/:roleId')
  @Roles(RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revoke a role from a user. Returns the updated role list.' })
  @ApiOkResponse({ type: String, isArray: true })
  async removeRole(
    @Param('id', ParseUuidPipe) id: string,
    @Param('roleId', ParseUuidPipe) roleId: string,
  ): Promise<string[]> {
    return this.usersService.removeRole(id, roleId);
  }
}
