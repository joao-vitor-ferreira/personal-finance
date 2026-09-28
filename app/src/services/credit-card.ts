import { apiFetch } from '@/services/api';

export interface CreditCard {
  id: string;
  name: string;
  brand: string;
  lastFourDigits: string;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function fetchCreditCards() {
  return apiFetch<CreditCard[]>('/credit-cards');
}
