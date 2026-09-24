import { CategoryType } from '../generated/prisma/client.js';

export interface DefaultCategory {
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
}

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  {
    name: 'Alimentação',
    type: CategoryType.EXPENSE,
    color: '#EF4444',
    icon: 'restaurant',
  },
  {
    name: 'Transporte',
    type: CategoryType.EXPENSE,
    color: '#F97316',
    icon: 'car',
  },
  {
    name: 'Moradia',
    type: CategoryType.EXPENSE,
    color: '#8B5CF6',
    icon: 'home',
  },
  {
    name: 'Saúde',
    type: CategoryType.EXPENSE,
    color: '#EC4899',
    icon: 'medical',
  },
  {
    name: 'Educação',
    type: CategoryType.EXPENSE,
    color: '#3B82F6',
    icon: 'school',
  },
  {
    name: 'Lazer',
    type: CategoryType.EXPENSE,
    color: '#14B8A6',
    icon: 'game-controller',
  },
  {
    name: 'Assinaturas',
    type: CategoryType.EXPENSE,
    color: '#6366F1',
    icon: 'repeat',
  },
  {
    name: 'Compras',
    type: CategoryType.EXPENSE,
    color: '#A855F7',
    icon: 'cart',
  },
  {
    name: 'Salário',
    type: CategoryType.INCOME,
    color: '#22C55E',
    icon: 'cash',
  },
  {
    name: 'Investimentos',
    type: CategoryType.BOTH,
    color: '#06B6D4',
    icon: 'trending-up',
  },
  {
    name: 'Outros',
    type: CategoryType.BOTH,
    color: '#64748B',
    icon: 'ellipsis-horizontal',
  },
];
