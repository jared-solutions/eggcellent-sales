import { useState, useEffect, useMemo, useCallback } from 'react';
import djangoApi from '@/integrations/django/client';
import { useCompany } from '@/hooks/useCompany';

export interface VaccinationRecord {
  id: string;
  name: string;
  dateGiven: string;
  nextDue: string;
  notes: string;
  completed: boolean;
}

export const useVaccinations = () => {
  const { currentCompany } = useCompany();
  const [vaccinationRecords, setVaccinationRecords] = useState<VaccinationRecord[]>([]);
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
      const data = await djangoApi.vaccinationRecords.list(currentCompany.id);
      setVaccinationRecords(data.map((r: any) => ({
        id: r.id,
        name: r.vaccine_name,
        dateGiven: r.date_given,
        nextDue: r.next_due_date || '',
        notes: r.notes || '',
        completed: !!r.date_given,
      })));
    } catch (error) {
      console.error('Error loading vaccination records:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id, currentCompany?.name]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Get completed vaccination records sorted by date (newest first)
  const completedVaccinations = useMemo(() => {
    return vaccinationRecords
      .filter((v) => v.completed && v.dateGiven)
      .sort((a, b) => new Date(b.dateGiven).getTime() - new Date(a.dateGiven).getTime());
  }, [vaccinationRecords]);

  // Get all vaccination dates for impact analysis
  const vaccinationDates = useMemo(() => {
    return completedVaccinations.map((v) => ({
      name: v.name,
      date: new Date(v.dateGiven),
      dateString: v.dateGiven,
    }));
  }, [completedVaccinations]);

  // Add new vaccination record
  const addRecord = async (record: Omit<VaccinationRecord, 'id' | 'completed'>) => {
    if (!currentCompany?.id) return;
    
    try {
      const result = await djangoApi.vaccinationRecords.create({
        company_id: currentCompany.id,
        vaccine_name: record.name,
        date_given: record.dateGiven,
        next_due_date: record.nextDue || undefined,
        notes: record.notes,
      });
      setVaccinationRecords(prev => [...prev, {
        id: result.id,
        name: result.vaccine_name,
        dateGiven: result.date_given,
        nextDue: result.next_due_date || '',
        notes: result.notes || '',
        completed: true,
      }]);
    } catch (error) {
      console.error('Error adding vaccination record:', error);
      throw error;
    }
  };

  // Delete vaccination record
  const deleteRecord = async (id: string) => {
    try {
      await djangoApi.vaccinationRecords.delete(id);
      setVaccinationRecords(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting vaccination record:', error);
      throw error;
    }
  };

  return {
    vaccinationRecords,
    isLoading,
    completedVaccinations,
    vaccinationDates,
    addRecord,
    deleteRecord,
    refresh: loadRecords,
  };
};
