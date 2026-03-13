import { useQuery } from '@tanstack/react-query';
import djangoApi from '@/integrations/django/client';
import { DashboardStats } from '@/lib/types';
import { useCompany } from '@/hooks/useCompany';

export const usePaymentsByMethod = (startDate?: string, endDate?: string) => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['payments-by-method', currentCompany?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentCompany) return [];
      const data = await djangoApi.dashboard.getPaymentsByMethod(currentCompany.id, startDate, endDate);
      return data;
    },
    enabled: !!currentCompany
  });
};

export const useDashboardStats = (startDate?: string, endDate?: string, supplyId?: string) => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['dashboard-stats', currentCompany?.id, startDate, endDate, supplyId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!currentCompany) return {
        expectedRevenue: 0, actualRevenue: 0, totalOutstanding: 0,
        paymentsReceived: 0, unsoldTraysValue: 0, unsoldTrays: 0,
        totalExpenses: 0, depositedAmount: 0, cashOnHand: 0,
        feedExpensePerDay: 0, feedPurchased: 0, feedConsumed: 0,
        feedConsumedKg: 0, avgFeedPricePerKg: 0, dailyFeedKg: 0,
        expenseBreakdown: {}
      };
      
      const stats = await djangoApi.dashboard.getStats(currentCompany.id, startDate, endDate, supplyId);
      return { ...stats, unsoldTrays: stats.unsoldTrays || 0 };
    },
    enabled: !!currentCompany
  });
};

export const useProfitStats = () => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['profit-stats', currentCompany?.id],
    queryFn: async (): Promise<{ sales: any[]; payments: any[]; expenses: any[] }> => {
      if (!currentCompany) return { sales: [], payments: [], expenses: [] };
      
      // Fetch all data at once
      const [sales, payments, expenses] = await Promise.all([
        djangoApi.sales.list(currentCompany.id),
        djangoApi.payments.list(currentCompany.id),
        djangoApi.expenses.list(currentCompany.id),
      ]);
      
      return {
        sales: sales || [],
        payments: payments || [],
        expenses: expenses || [],
      };
    },
    enabled: !!currentCompany
  });
};

export const useRevenueByCategory = (startDate?: string, endDate?: string) => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['revenue-by-category', currentCompany?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentCompany) return [];
      const data = await djangoApi.dashboard.getRevenueByCategory(currentCompany.id, startDate, endDate);
      return data;
    },
    enabled: !!currentCompany
  });
};

export const useTopCustomersByBalance = (limit = 5) => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['top-customers-balance', currentCompany?.id, limit],
    queryFn: async () => {
      if (!currentCompany) return [];
      const data = await djangoApi.dashboard.getTopCustomers(currentCompany.id, limit);
      return data;
    },
    enabled: !!currentCompany
  });
};

export const useMostRecentSupply = () => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['most-recent-supply', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return null;
      const data = await djangoApi.supplies.getMostRecent(currentCompany.id);
      return data;
    },
    enabled: !!currentCompany
  });
};

export const useSupplyRemainingTrays = (supplyId?: string) => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['supply-remaining', supplyId, currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany || !supplyId) return null;
      const data = await djangoApi.supplies.getRemaining(supplyId);
      return data;
    },
    enabled: !!currentCompany && !!supplyId
  });
};

export const useFeedStats = () => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['feed-stats', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return null;
      const data = await djangoApi.dashboard.getFeedStats(currentCompany.id);
      return data;
    },
    enabled: !!currentCompany
  });
};
