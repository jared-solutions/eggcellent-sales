import { useState, useEffect, useMemo, useCallback } from 'react';
import djangoApi from '@/integrations/django/client';
import { useCompany } from '@/hooks/useCompany';

export interface MortalityRecord {
  id: string;
  date: string;
  count: number;
  cause: string;
  notes: string;
}

export const useMortalityRecords = () => {
  const { currentCompany } = useCompany();
  const [mortalityRecords, setMortalityRecords] = useState<MortalityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load records from API
  const loadRecords = useCallback(async () => {
    if (!currentCompany?.id) {
      setIsLoading(false);
      return;
    }

    // Don't load if company name is empty (placeholder)
    if (!currentCompany.name) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await djangoApi.mortalityRecords.list(currentCompany.id);
      setMortalityRecords(data.map((r: any) => ({
        id: r.id,
        date: r.date,
        count: r.count,
        cause: r.cause,
        notes: r.notes || '',
      })));
    } catch (error) {
      console.error('Error loading mortality records:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id, currentCompany?.name]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Get total mortality count
  const totalMortality = useMemo(() => {
    return mortalityRecords.reduce((sum, r) => sum + r.count, 0);
  }, [mortalityRecords]);

  // Get mortality by cause
  const mortalityByCause = useMemo(() => {
    const causeMap = new Map<string, number>();
    mortalityRecords.forEach((r) => {
      const current = causeMap.get(r.cause) || 0;
      causeMap.set(r.cause, current + r.count);
    });
    return Array.from(causeMap.entries()).map(([cause, count]) => ({ cause, count }));
  }, [mortalityRecords]);

  // Get mortality by month
  const mortalityByMonth = useMemo(() => {
    const monthMap = new Map<string, number>();
    mortalityRecords.forEach((r) => {
      const month = new Date(r.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      const current = monthMap.get(month) || 0;
      monthMap.set(month, current + r.count);
    });
    return Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [mortalityRecords]);

  // Add new mortality record
  const addRecord = async (record: Omit<MortalityRecord, 'id'>) => {
    if (!currentCompany?.id) return;
    
    try {
      const result = await djangoApi.mortalityRecords.create({
        company_id: currentCompany.id,
        date: record.date,
        count: record.count,
        cause: record.cause,
        notes: record.notes,
      });
      setMortalityRecords(prev => [...prev, {
        id: result.id,
        date: result.date,
        count: result.count,
        cause: result.cause,
        notes: result.notes || '',
      }]);
    } catch (error) {
      console.error('Error adding mortality record:', error);
      throw error;
    }
  };

  // Delete mortality record
  const deleteRecord = async (id: string) => {
    try {
      await djangoApi.mortalityRecords.delete(id);
      setMortalityRecords(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting mortality record:', error);
      throw error;
    }
  };

  return {
    mortalityRecords,
    isLoading,
    totalMortality,
    mortalityByCause,
    mortalityByMonth,
    addRecord,
    deleteRecord,
    refresh: loadRecords,
  };
};
