import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import djangoApi from '@/integrations/django/client';
import { CategoryPrice, EggCategory } from '@/lib/types';
import { useCompany } from '@/hooks/useCompany';

export const usePrices = () => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['prices', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const data = await djangoApi.prices.list(currentCompany.id);
      return data as CategoryPrice[];
    },
    enabled: !!currentCompany
  });
};

export const useCurrentPrices = () => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['current-prices', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return { starter: null, mid: null, normal: null };
      
      const data = await djangoApi.prices.getCurrent(currentCompany.id);
      return data;
    },
    enabled: !!currentCompany
  });
};

export const useCreatePrice = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  
  return useMutation({
    mutationFn: async (price: { category: EggCategory; price_per_tray: number; start_date: string; price_per_piece?: number }) => {
      if (!currentCompany) throw new Error('No company selected');
      
      const data = await djangoApi.prices.create({
        company_id: currentCompany.id,
        category: price.category,
        price_per_tray: price.price_per_tray,
        start_date: price.start_date,
        price_per_piece: price.price_per_piece,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      queryClient.invalidateQueries({ queryKey: ['current-prices'] });
    }
  });
};
