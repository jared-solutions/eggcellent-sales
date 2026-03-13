import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import djangoApi from '@/integrations/django/client';
import { Payment } from '@/lib/types';
import { useCompany } from '@/hooks/useCompany';

export const usePayments = (filters?: { customerId?: string; supplyId?: string; method?: string }) => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['payments', currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany) return [];
      const data = await djangoApi.payments.list(currentCompany.id, filters);
      return data as Payment[];
    },
    enabled: !!currentCompany
  });
};

export const useCustomerPayments = (customerId?: string) => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['customer-payments', currentCompany?.id, customerId],
    queryFn: async () => {
      if (!currentCompany || !customerId) return [];
      const data = await djangoApi.payments.list(currentCompany.id, { customerId });
      return data as Payment[];
    },
    enabled: !!currentCompany && !!customerId
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  
  return useMutation({
    mutationFn: async (payment: { 
      customer_id: string; payment_date: string; amount: number;
      deposited_amount?: number; payment_method?: string; notes?: string;
      sale_id?: string; weekly_supply_id?: string;
    }) => {
      if (!currentCompany) throw new Error('No company selected');
      const data = await djangoApi.payments.create({
        company_id: currentCompany.id,
        customer_id: payment.customer_id,
        payment_date: payment.payment_date,
        amount: payment.amount,
        deposited_amount: payment.deposited_amount,
        payment_method: payment.payment_method,
        notes: payment.notes,
        sale_id: payment.sale_id,
        weekly_supply_id: payment.weekly_supply_id,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['customer-payments'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      id: string;
      payment_date?: string;
      amount?: number;
      deposited_amount?: number;
      payment_method?: string;
      notes?: string;
      sale_id?: string | null;
      weekly_supply_id?: string | null;
    }) => {
      const { id, ...updateData } = params;
      const data = await djangoApi.payments.update(id, updateData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['customer-payments'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await djangoApi.payments.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['customer-payments'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });
};
