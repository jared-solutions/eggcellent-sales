import { useState, useEffect, useMemo, useCallback } from 'react';
import djangoApi from '@/integrations/django/client';
import { useCompany } from '@/hooks/useCompany';

export interface TreatmentRecord {
  id: string;
  treatmentType: string;
  productName: string;
  dateGiven: string;
  dosage: string;
  reason: string;
  daysGiven: string;
  notes: string;
}

export const useTreatmentRecords = () => {
  const { currentCompany } = useCompany();
  const [treatmentRecords, setTreatmentRecords] = useState<TreatmentRecord[]>([]);
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
      const data = await djangoApi.treatmentRecords.list(currentCompany.id);
      setTreatmentRecords(data.map((r: any) => ({
        id: r.id,
        treatmentType: r.treatment_type,
        productName: r.product_name,
        dateGiven: r.date_given,
        dosage: r.dosage || '',
        reason: r.reason || '',
        daysGiven: r.days_given ? r.days_given.toString() : '',
        notes: r.notes || '',
      })));
    } catch (error) {
      console.error('Error loading treatment records:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id, currentCompany?.name]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Get completed treatment records sorted by date (newest first)
  const completedTreatments = useMemo(() => {
    return treatmentRecords
      .filter((t) => t.dateGiven)
      .sort((a, b) => new Date(b.dateGiven).getTime() - new Date(a.dateGiven).getTime());
  }, [treatmentRecords]);

  // Get treatment dates for analysis
  const treatmentDates = useMemo(() => {
    return completedTreatments.map((t) => ({
      name: t.productName,
      type: t.treatmentType,
      date: new Date(t.dateGiven),
      dateString: t.dateGiven,
    }));
  }, [completedTreatments]);

  // Add new treatment record
  const addRecord = async (record: Omit<TreatmentRecord, 'id'>) => {
    if (!currentCompany?.id) return;
    
    const apiData = {
      company_id: currentCompany.id,
      treatment_type: record.treatmentType,
      product_name: record.productName,
      date_given: record.dateGiven,
      dosage: record.dosage || null,
      reason: record.reason || null,
      days_given: record.daysGiven ? parseInt(record.daysGiven) : null,
      notes: record.notes || null,
    };
    console.log('Creating treatment record:', apiData);
    
    try {
      const result = await djangoApi.treatmentRecords.create(apiData);
      setTreatmentRecords(prev => [...prev, {
        id: result.id,
        treatmentType: result.treatment_type,
        productName: result.product_name,
        dateGiven: result.date_given,
        dosage: result.dosage || '',
        reason: result.reason || '',
        daysGiven: result.days_given ? result.days_given.toString() : '',
        notes: result.notes || '',
      }]);
    } catch (error) {
      console.error('Error adding treatment record:', error);
      throw error;
    }
  };

  // Delete treatment record
  const deleteRecord = async (id: string) => {
    try {
      await djangoApi.treatmentRecords.delete(id);
      setTreatmentRecords(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting treatment record:', error);
      throw error;
    }
  };

  // Update treatment record
  const updateRecord = async (id: string, record: Partial<TreatmentRecord>) => {
    try {
      const result = await djangoApi.treatmentRecords.update(id, {
        treatment_type: record.treatmentType,
        product_name: record.productName,
        date_given: record.dateGiven,
        dosage: record.dosage || undefined,
        reason: record.reason || undefined,
        days_given: record.daysGiven ? parseInt(record.daysGiven) : undefined,
        notes: record.notes || undefined,
      });
      setTreatmentRecords(prev => prev.map(r => r.id === id ? {
        id: result.id,
        treatmentType: result.treatment_type,
        productName: result.product_name,
        dateGiven: result.date_given,
        dosage: result.dosage || '',
        reason: result.reason || '',
        daysGiven: result.days_given ? result.days_given.toString() : '',
        notes: result.notes || '',
      } : r));
    } catch (error) {
      console.error('Error updating treatment record:', error);
      throw error;
    }
  };

  return {
    treatmentRecords,
    isLoading,
    completedTreatments,
    treatmentDates,
    addRecord,
    deleteRecord,
    updateRecord,
    refresh: loadRecords,
  };
};
