import { useState, useEffect, useMemo, useCallback } from 'react';
import djangoApi from '@/integrations/django/client';
import { useCompany } from '@/hooks/useCompany';
import { useFlockSettings } from './useFlockSettings';
import { useCreateExpense } from './useExpenses';

export interface FeedRecord {
  id: string;
  date: string;
  type: 'purchase';
  // Purchase specific fields
  sacks: number;
  kgPerSack: number;
  brand: string;
  // Calculated fields
  quantityKg: number;
  pricePerKg: number;
  totalPrice: number;
  notes: string;
}

export interface FeedInventory {
  currentStock: number;
  totalPurchased: number;
  daysRemaining: number | null;
  lastUpdated: string;
}

export const useFeedInventory = () => {
  const { currentCompany } = useCompany();
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date()); // Track current date for auto-update
  const flockSettings = useFlockSettings();
  const createExpense = useCreateExpense();

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
      const data = await djangoApi.feedInventory.list(currentCompany.id);
      setRecords(data.map((r: any) => ({
        id: r.id,
        date: r.purchase_date,
        type: 'purchase' as const,
        sacks: 0, // Not stored in API, calculated
        kgPerSack: 0, // Not stored in API
        brand: r.feed_type,
        quantityKg: parseFloat(r.quantity_kg) || 0,
        pricePerKg: parseFloat(r.unit_cost) || 0,
        totalPrice: (parseFloat(r.quantity_kg) || 0) * (parseFloat(r.unit_cost) || 0),
        notes: r.notes || '',
      })));
    } catch (error) {
      console.error('Error loading feed inventory:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id, currentCompany?.name]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Auto-update the current date every minute to recalculate days remaining
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  // Calculate daily feed consumption based on flock settings
  const dailyConsumption = useMemo(() => {
    const { totalChickens, defaultDailyFeed } = flockSettings.settings;
    if (totalChickens > 0 && defaultDailyFeed > 0) {
      return defaultDailyFeed; // kg per day for entire flock
    }
    return 0;
  }, [flockSettings.settings]);

  // Calculate inventory stats - depends on currentDate for auto-update
  const inventory: FeedInventory = useMemo(() => {
    const totalPurchased = records.reduce((sum, r) => sum + r.quantityKg, 0);
    
    // Calculate consumption based on days since last purchase
    // We track consumption from the most recent purchase date
    let totalConsumed = 0;
    let daysRemaining: number | null = null;
    
    if (records.length > 0 && dailyConsumption > 0) {
      // Find the most recent purchase date
      const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastPurchaseDate = new Date(sortedRecords[0].date);
      
      // Calculate days since last purchase (minimum 1 day)
      const daysSinceLastPurchase = Math.max(1, Math.floor((currentDate.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Calculate what should have been consumed since last purchase
      totalConsumed = daysSinceLastPurchase * dailyConsumption;
      
      // Current stock = total purchased - consumed
      const currentStock = totalPurchased - totalConsumed;
      
      // Calculate days remaining based on current stock
      if (currentStock > 0) {
        daysRemaining = Math.floor(currentStock / dailyConsumption);
      }
      
      return {
        currentStock,
        totalPurchased,
        daysRemaining,
        lastUpdated: sortedRecords[0].date
      };
    }
    
    return {
      currentStock: 0,
      totalPurchased,
      daysRemaining,
      lastUpdated: ''
    };
  }, [records, dailyConsumption, currentDate]);

  // Add a feed record with optional expense
  const addRecord = useCallback(async (record: Omit<FeedRecord, 'id'>, addToExpenses: boolean = false) => {
    if (!currentCompany?.id) return;

    try {
      const result = await djangoApi.feedInventory.create({
        company_id: currentCompany.id,
        feed_type: record.brand || 'Layers Mash',
        quantity_kg: record.quantityKg,
        unit_cost: record.pricePerKg,
        purchase_date: record.date,
        notes: record.notes,
      });

      const newRecord: FeedRecord = {
        ...record,
        id: result.id,
      };
      
      setRecords(prev => [...prev, newRecord]);

      // If addToExpenses is true, create an expense record
      if (addToExpenses && record.totalPrice > 0) {
        try {
          await createExpense.mutateAsync({
            expense_date: record.date,
            category: 'Feed',
            description: record.brand 
              ? `Feed purchase - ${record.brand} (${record.sacks} sacks × ${record.kgPerSack}kg)`
              : `Feed purchase (${record.sacks} sacks × ${record.kgPerSack}kg)`,
            amount: record.totalPrice,
            payment_method: 'Cash',
            notes: record.notes || undefined
          });
        } catch (error) {
          console.error('Error adding feed expense:', error);
        }
      }

      return newRecord;
    } catch (error) {
      console.error('Error adding feed record:', error);
      throw error;
    }
  }, [currentCompany?.id, createExpense]);

  // Delete a record
  const deleteRecord = useCallback(async (id: string) => {
    try {
      await djangoApi.feedInventory.delete(id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting feed record:', error);
      throw error;
    }
  }, []);

  // Get feed brands used
  const brands = useMemo(() => {
    const brandSet = new Set<string>();
    records.forEach(r => {
      if (r.brand) brandSet.add(r.brand);
    });
    return Array.from(brandSet);
  }, [records]);

  return {
    records,
    inventory,
    isLoading,
    addRecord,
    deleteRecord,
    dailyConsumption,
    brands,
    refresh: loadRecords
  };
};
