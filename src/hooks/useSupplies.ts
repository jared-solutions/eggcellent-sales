import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import djangoApi from '@/integrations/django/client';
import { WeeklySupply } from '@/lib/types';
import { useCompany } from '@/hooks/useCompany';

export const useSupplies = () => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['supplies', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const data = await djangoApi.supplies.list(currentCompany.id);
      return data as WeeklySupply[];
    },
    enabled: !!currentCompany
  });
};

export const useCreateSupply = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  
  return useMutation({
    mutationFn: async (supply: Omit<WeeklySupply, 'id' | 'company_id' | 'total_trays' | 'created_at' | 'updated_at'>) => {
      if (!currentCompany) throw new Error('No company selected');
      const data = await djangoApi.supplies.create({
        company_id: currentCompany.id,
        week_start_date: supply.week_start_date,
        week_end_date: supply.week_end_date,
        starter_trays: supply.starter_trays,
        mid_trays: supply.mid_trays,
        normal_trays: supply.normal_trays,
        notes: supply.notes || '',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });
};

export const useUpdateSupply = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WeeklySupply> & { id: string }) => {
      const data = await djangoApi.supplies.update(id, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });
};
