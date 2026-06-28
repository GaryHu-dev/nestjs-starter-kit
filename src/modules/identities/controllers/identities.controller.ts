import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { appConfig } from '@/config/app.config';
import { CurrentUser } from '@/modules/auth/decorators';
import type { RequestUser } from '@/shared/types';
import { IdentityDto } from '../dto/response';
import { IdentitiesService } from '../services/identities.service';

@ApiTags('Identities')
@ApiBearerAuth(appConfig.swaggerSecurityScheme)
@Controller({
  path: 'identities',
  version: appConfig.apiVersion,
})
export class IdentitiesController {
  constructor(private readonly identitiesService: IdentitiesService) {}

  @Get('me')
  @ApiOperation({ summary: 'List linked authentication providers for the current user.' })
  @ApiOkResponse({ type: IdentityDto, isArray: true })
  async findMyIdentities(@CurrentUser() user: RequestUser): Promise<IdentityDto[]> {
    const identities = await this.identitiesService.findByUserId(user.sub);
    return identities.map((identity) => ({
      id: identity.id,
      provider: identity.provider,
      expiresAt: identity.expiresAt,
      lastLoginAt: identity.lastLoginAt,
      createdAt: identity.createdAt,
    }));
  }
}
