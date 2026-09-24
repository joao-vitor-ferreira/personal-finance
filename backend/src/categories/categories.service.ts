import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUniqueConstraintError } from '../common/prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: {
          userId,
          name: dto.name.trim(),
          type: dto.type,
          color: dto.color,
          icon: dto.icon?.trim(),
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Já existe uma categoria com este nome e tipo.',
        );
      }

      throw error;
    }
  }

  findAll(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const result = await this.prisma.category.updateMany({
      where: { id, userId },
      data: {
        name: dto.name?.trim(),
        type: dto.type,
        color: dto.color,
        icon: dto.icon?.trim(),
        isActive: dto.isActive,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    return this.findOwned(userId, id);
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.category.updateMany({
      where: { id, userId },
      data: { isActive: false },
    });

    if (result.count === 0) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    return { id, isActive: false };
  }

  async findOwned(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    return category;
  }
}
