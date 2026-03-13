import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import djangoApi from '@/integrations/django/client';
import { Expense } from '@/lib/types';
import { useCompany } from '@/hooks/useCompany';

export const useExpenses = (supplyId?: string) => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['expenses', currentCompany?.id, supplyId],
    queryFn: async () => {
      if (!currentCompany) return [];
      const response = await djangoApi.expenses.list(currentCompany.id, supplyId);
      return response as Expense[];
    },
    enabled: !!currentCompany,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  
  return useMutation({
    mutationFn: async (expense: {
      expense_date: string;
      category: string;
      description: string;
      amount: number;
      payment_method?: string;
      notes?: string;
      weekly_supply_id?: string;
    }) => {
      if (!currentCompany) throw new Error('No company selected');
      const data = await djangoApi.expenses.create({
        company_id: currentCompany.id,
        expense_date: expense.expense_date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        payment_method: expense.payment_method,
        notes: expense.notes,
        weekly_supply_id: expense.weekly_supply_id,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await djangoApi.expenses.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });
};
