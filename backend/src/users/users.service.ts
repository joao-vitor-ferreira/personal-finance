import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_CATEGORIES } from '../categories/default-categories.js';
import { isUniqueConstraintError } from '../common/prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createWithDefaultCategories(input: {
    name: string;
    email: string;
    passwordHash: string;
  }) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: input,
          select: publicUserSelect,
        });

        await transaction.category.createMany({
          data: DEFAULT_CATEGORIES.map((category) => ({
            ...category,
            userId: user.id,
            isDefault: true,
          })),
        });

        return user;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Já existe um usuário com este e-mail.');
      }

      throw error;
    }
  }

  findAuthenticationByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findPublicById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }
}
