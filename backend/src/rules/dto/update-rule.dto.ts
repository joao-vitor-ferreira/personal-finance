import { PartialType } from '@nestjs/swagger';
import { CreateRuleDto } from './create-rule.dto.js';

export class UpdateRuleDto extends PartialType(CreateRuleDto) {}
