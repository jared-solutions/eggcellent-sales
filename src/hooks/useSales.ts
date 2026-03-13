import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import djangoApi from '@/integrations/django/client';
import { Sale, EggCategory, SaleItem } from '@/lib/types';
import { useCompany } from '@/hooks/useCompany';

interface SaleWithItems extends Omit<Sale, 'category' | 'quantity_trays' | 'price_per_tray'> {
  category?: EggCategory | null;
  quantity_trays?: number | null;
  price_per_tray?: number | null;
  sale_items?: SaleItem[];
}

export const useSales = (supplyId?: string) => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['sales', currentCompany?.id, supplyId],
    queryFn: async () => {
      if (!currentCompany) return [];
      const data = await djangoApi.sales.list(currentCompany.id, supplyId);
      return data as SaleWithItems[];
    },
    enabled: !!currentCompany
  });
};

export const useCustomerSales = (customerId?: string, supplyId?: string) => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['customer-sales', currentCompany?.id, customerId, supplyId],
    queryFn: async () => {
      if (!currentCompany || !customerId) return [];
      const data = await djangoApi.sales.getByCustomer(currentCompany.id, customerId, supplyId);
      return data as SaleWithItems[];
    },
    enabled: !!currentCompany && !!customerId
  });
};

export const useCreateSaleWithItems = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  
  return useMutation({
    mutationFn: async (sale: { 
      customer_id: string; sale_date: string; notes?: string; weekly_supply_id?: string;
      items: { category: EggCategory; quantity_trays: number; quantity_pieces?: number; price_per_tray: number; }[];
    }) => {
      if (!currentCompany) {
        console.error('No company selected - currentCompany is:', currentCompany);
        throw new Error('No company selected. Please refresh the page and try again.');
      }
      
      console.log('Creating sale with company:', currentCompany.id, 'data:', sale);
      
      const data = await djangoApi.sales.createWithItems({
        company_id: currentCompany.id,
        customer_id: sale.customer_id,
        sale_date: sale.sale_date,
        notes: sale.notes,
        weekly_supply_id: sale.weekly_supply_id,
        items: sale.items,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customer-sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['supply-remaining'] });
    }
  });
};

export const useUpdateSale = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      id: string;
      sale_date?: string;
      notes?: string;
      weekly_supply_id?: string | null;
      customer_id?: string;
      items?: { category: EggCategory; quantity_trays: number; quantity_pieces?: number; price_per_tray: number; }[];
    }) => {
      const updateData: any = {};
      if (params.sale_date !== undefined) updateData.sale_date = params.sale_date;
      if (params.notes !== undefined) updateData.notes = params.notes;
      if (params.weekly_supply_id !== undefined) updateData.weekly_supply_id = params.weekly_supply_id;
      if (params.customer_id !== undefined) updateData.customer_id = params.customer_id;
      if (params.items) updateData.items = params.items;
      
      console.log('Updating sale:', params.id, 'with data:', updateData);
      
      const data = await djangoApi.sales.update(params.id, updateData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customer-sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['supply-remaining'] });
    }
  });
};

export const useDeleteSale = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await djangoApi.sales.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customer-sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['supply-remaining'] });
    }
  });
};
