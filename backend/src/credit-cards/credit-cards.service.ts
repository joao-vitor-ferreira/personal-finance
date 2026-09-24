import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateCreditCardDto } from './dto/create-credit-card.dto.js';
import type { UpdateCreditCardDto } from './dto/update-credit-card.dto.js';

@Injectable()
export class CreditCardsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateCreditCardDto) {
    return this.prisma.creditCard.create({
      data: {
        userId,
        name: dto.name.trim(),
        brand: dto.brand.trim(),
        lastFourDigits: dto.lastFourDigits,
        creditLimit: dto.creditLimit,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        isActive: dto.isActive,
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.creditCard.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(userId: string, id: string) {
    const creditCard = await this.prisma.creditCard.findFirst({
      where: { id, userId },
    });

    if (!creditCard) {
      throw new NotFoundException('Cartão de crédito não encontrado.');
    }

    return creditCard;
  }

  async update(userId: string, id: string, dto: UpdateCreditCardDto) {
    const result = await this.prisma.creditCard.updateMany({
      where: { id, userId },
      data: {
        name: dto.name?.trim(),
        brand: dto.brand?.trim(),
        lastFourDigits: dto.lastFourDigits,
        creditLimit: dto.creditLimit,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        isActive: dto.isActive,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Cartão de crédito não encontrado.');
    }

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.creditCard.updateMany({
      where: { id, userId },
      data: { isActive: false },
    });

    if (result.count === 0) {
      throw new NotFoundException('Cartão de crédito não encontrado.');
    }

    return { id, isActive: false };
  }
}
