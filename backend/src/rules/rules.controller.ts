import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateRuleDto } from './dto/create-rule.dto.js';
import { UpdateRuleDto } from './dto/update-rule.dto.js';
import { RulesService } from './rules.service.js';

@ApiTags('Regras automáticas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Regra criada.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRuleDto) {
    return this.rulesService.create(user.id, dto);
  }

  @Get()
  @ApiOkResponse({ description: 'Regras do usuário autenticado.' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.rulesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Regra encontrada.' })
  @ApiNotFoundResponse({
    description: 'Regra inexistente ou de outro usuário.',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rulesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Regra atualizada.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.rulesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Regra desativada.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rulesService.remove(user.id, id);
  }
}
