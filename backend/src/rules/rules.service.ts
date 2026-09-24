import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TransactionType } from '../generated/prisma/client.js';
import { matchRuleCategory } from './rule-matcher.js';
import type { CreateRuleDto } from './dto/create-rule.dto.js';
import type { UpdateRuleDto } from './dto/update-rule.dto.js';

@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateRuleDto) {
    await this.assertOwnedCategory(userId, dto.categoryId);

    return this.prisma.categorizationRule.create({
      data: {
        userId,
        name: dto.name.trim(),
        field: dto.field,
        operator: dto.operator,
        value: dto.value.trim(),
        categoryId: dto.categoryId,
        caseSensitive: dto.caseSensitive,
        priority: dto.priority,
        isActive: dto.isActive,
      },
      include: { category: true },
    });
  }

  findAll(userId: string) {
    return this.prisma.categorizationRule.findMany({
      where: { userId },
      include: { category: true },
      orderBy: [{ isActive: 'desc' }, { priority: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(userId: string, id: string) {
    const rule = await this.prisma.categorizationRule.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!rule) {
      throw new NotFoundException('Regra não encontrada.');
    }

    return rule;
  }

  async update(userId: string, id: string, dto: UpdateRuleDto) {
    if (dto.categoryId) {
      await this.assertOwnedCategory(userId, dto.categoryId);
    }

    const result = await this.prisma.categorizationRule.updateMany({
      where: { id, userId },
      data: {
        name: dto.name?.trim(),
        field: dto.field,
        operator: dto.operator,
        value: dto.value?.trim(),
        categoryId: dto.categoryId,
        caseSensitive: dto.caseSensitive,
        priority: dto.priority,
        isActive: dto.isActive,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Regra não encontrada.');
    }

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.categorizationRule.updateMany({
      where: { id, userId },
      data: { isActive: false },
    });

    if (result.count === 0) {
      throw new NotFoundException('Regra não encontrada.');
    }

    return { id, isActive: false };
  }

  findActiveForMatching(userId: string) {
    return this.prisma.categorizationRule.findMany({
      where: { userId, isActive: true, category: { isActive: true } },
      include: { category: { select: { type: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async suggestCategory(
    userId: string,
    description: string,
    transactionType?: TransactionType,
  ) {
    const rules = await this.findActiveForMatching(userId);
    return matchRuleCategory(rules, description, transactionType);
  }

  private async assertOwnedCategory(userId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId, isActive: true },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }
  }
}
