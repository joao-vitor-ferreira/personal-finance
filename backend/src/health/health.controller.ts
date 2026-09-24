import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthService } from './health.service.js';

@ApiTags('Saúde')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        database: 'up',
        timestamp: '2026-09-24T12:00:00.000Z',
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'Banco de dados indisponível.',
  })
  check() {
    return this.healthService.check();
  }
}
