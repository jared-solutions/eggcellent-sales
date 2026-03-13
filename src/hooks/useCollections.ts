import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import djangoApi from '@/integrations/django/client';
import { DailyCollection } from '@/lib/types';
import { useCompany } from '@/hooks/useCompany';

export const useCollections = () => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['daily-collections', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const data = await djangoApi.collections.list(currentCompany.id);
      return data as DailyCollection[];
    },
    enabled: !!currentCompany
  });
};

export const useCreateCollection = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  
  return useMutation({
    mutationFn: async (collection: {
      collection_date: string;
      starter_trays: number;
      mid_trays: number;
      normal_trays: number;
      notes?: string;
    }) => {
      if (!currentCompany) throw new Error('No company selected');
      const data = await djangoApi.collections.create({
        company_id: currentCompany.id,
        collection_date: collection.collection_date,
        starter_trays: collection.starter_trays,
        mid_trays: collection.mid_trays,
        normal_trays: collection.normal_trays,
        notes: collection.notes,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-collections'] });
    }
  });
};

export const useUpdateCollection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DailyCollection> & { id: string }) => {
      const data = await djangoApi.collections.update(id, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-collections'] });
    }
  });
};

export const useConvertCollectionsToSupply = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  
  return useMutation({
    mutationFn: async ({ 
      collectionIds, 
      weekStart, 
      weekEnd, 
      starterTrays, 
      midTrays, 
      normalTrays, 
      notes 
    }: {
      collectionIds: string[];
      weekStart: string;
      weekEnd: string;
      starterTrays: number;
      midTrays: number;
      normalTrays: number;
      notes?: string;
    }) => {
      if (!currentCompany) throw new Error('No company selected');
      
      const data = await djangoApi.collections.convertToSupply({
        company_id: currentCompany.id,
        collectionIds,
        weekStart,
        weekEnd,
        starterTrays,
        midTrays,
        normalTrays,
        notes,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-collections'] });
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });
};

export const useDeleteCollection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await djangoApi.collections.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-collections'] });
    }
  });
};
