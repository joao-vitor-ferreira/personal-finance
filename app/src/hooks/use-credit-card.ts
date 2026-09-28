import { useQuery } from '@tanstack/react-query';
import { fetchCreditCards } from '@/services/credit-card';

export function useCreditCards() {
  return useQuery({
    queryKey: ['credit-cards'],
    queryFn: fetchCreditCards,
  });
}
