import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import djangoApi from '@/integrations/django/client';
import { Customer, CustomerWithBalance } from '@/lib/types';
import { useCompany } from '@/hooks/useCompany';

export const useCustomers = () => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['customers', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const data = await djangoApi.customers.list(currentCompany.id);
      return data as Customer[];
    },
    enabled: !!currentCompany
  });
};

export const useCustomersWithBalance = () => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['customers-with-balance', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      
      const data = await djangoApi.customers.listWithBalance(currentCompany.id);
      return data as CustomerWithBalance[];
    },
    enabled: !!currentCompany
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  
  return useMutation({
    mutationFn: async (customer: { name: string; phone?: string }) => {
      if (!currentCompany) throw new Error('No company selected');
      const data = await djangoApi.customers.create(currentCompany.id, customer.name, customer.phone);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-balance'] });
    }
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const data = await djangoApi.customers.update(id, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-balance'] });
    }
  });
};
