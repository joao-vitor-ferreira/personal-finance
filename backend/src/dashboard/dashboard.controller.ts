import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardFilterDto } from './dto/dashboard-filter.dto.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOkResponse({ description: 'Receitas, despesas e saldo do período.' })
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: DashboardFilterDto,
  ) {
    return this.dashboardService.summary(user.id, filter);
  }

  @Get('monthly')
  @ApiOkResponse({ description: 'Totais agrupados por mês.' })
  monthly(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: DashboardFilterDto,
  ) {
    return this.dashboardService.monthly(user.id, filter);
  }

  @Get('categories')
  @ApiOkResponse({
    description: 'Receitas e despesas agrupadas por categoria.',
  })
  categories(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: DashboardFilterDto,
  ) {
    return this.dashboardService.categories(user.id, filter);
  }
}
