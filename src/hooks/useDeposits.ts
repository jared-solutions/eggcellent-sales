import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import djangoApi from '@/integrations/django/client';
import { useCompany } from '@/hooks/useCompany';

export interface Deposit {
  id: string;
  company: string;
  weekly_supply?: {
    id: string;
    supply_date: string;
  };
  deposit_date: string;
  amount: number;
  payment_method?: string;
  notes?: string;
  cleared: boolean;
  cleared_date?: string;
  created_at: string;
}

/**
 * Supply deposit summary - shows revenue, deposited, and balance per supply
 */
export interface SupplyDepositSummary {
  supply_id: string;
  supply_date: string;
  revenue: number;
  deposited: number;
  balance: number;
  is_cleared: boolean;
}

export const useSupplyDepositSummary = (supplyId?: string) => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['supply-deposit-summary', currentCompany?.id, supplyId],
    queryFn: async () => {
      if (!currentCompany) return [];
      const data = await djangoApi.dashboard.getSupplyDepositSummary(currentCompany.id, supplyId);
      return data as SupplyDepositSummary[];
    },
    enabled: !!currentCompany
  });
};

export const useDeposits = (supplyId?: string) => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['deposits', currentCompany?.id, supplyId],
    queryFn: async () => {
      if (!currentCompany) return [];
      const data = await djangoApi.deposits.list(currentCompany.id, supplyId);
      return data as Deposit[];
    },
    enabled: !!currentCompany
  });
};

export const useCreateDeposit = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  
  return useMutation({
    mutationFn: async (deposit: {
      deposit_date: string;
      amount: number;
      payment_method?: string;
      notes?: string;
      weekly_supply_id?: string;
    }) => {
      if (!currentCompany) throw new Error('No company selected');
      const data = await djangoApi.deposits.create({
        company_id: currentCompany.id,
        deposit_date: deposit.deposit_date,
        amount: deposit.amount,
        payment_method: deposit.payment_method,
        notes: deposit.notes,
        weekly_supply_id: deposit.weekly_supply_id,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['supply-deposit-summary'] });
    }
  });
};

export const useDeleteDeposit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await djangoApi.deposits.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['supply-deposit-summary'] });
    }
  });
};

export const useUpdateDeposit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, cleared, cleared_date }: { id: string; cleared?: boolean; cleared_date?: string }) => {
      const data: { cleared?: boolean; cleared_date?: string } = {};
      if (cleared !== undefined) data.cleared = cleared;
      if (cleared_date !== undefined) data.cleared_date = cleared_date;
      return await djangoApi.deposits.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['supply-deposit-summary'] });
    }
  });
};
