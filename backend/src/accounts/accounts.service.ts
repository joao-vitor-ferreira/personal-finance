import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateAccountDto } from './dto/create-account.dto.js';
import type { UpdateAccountDto } from './dto/update-account.dto.js';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        userId,
        name: dto.name.trim(),
        type: dto.type,
        initialBalance: dto.initialBalance,
        currentBalance: dto.initialBalance,
        color: dto.color,
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId },
    });

    if (!account) {
      throw new NotFoundException('Conta não encontrada.');
    }

    return account;
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    const result = await this.prisma.account.updateMany({
      where: { id, userId },
      data: {
        name: dto.name?.trim(),
        type: dto.type,
        color: dto.color,
        isActive: dto.isActive,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Conta não encontrada.');
    }

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.account.updateMany({
      where: { id, userId },
      data: { isActive: false },
    });

    if (result.count === 0) {
      throw new NotFoundException('Conta não encontrada.');
    }

    return { id, isActive: false };
  }
}
