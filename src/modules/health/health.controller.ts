import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { appConfig } from '@/config/app.config';
import { Public } from '@/modules/auth/decorators';

@ApiTags('Health')
@Controller({
  path: 'health',
  version: appConfig.apiVersion,
})
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @Public()
  @SkipThrottle()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness and dependency health check.' })
  @ApiOkResponse({ description: 'Application and its dependencies are healthy.' })
  check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
