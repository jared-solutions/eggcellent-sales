import { useState, useEffect, useCallback } from 'react';
import djangoApi from '@/integrations/django/client';
import { useCompany } from '@/hooks/useCompany';

export type HousingType = 'cages' | 'freerange';

export interface FlockSettingsData {
  id?: string;
  company_id?: string;
  totalChickens: number;
  defaultDailyFeed: number;
  lastUpdated: string;
  housingType: HousingType;
  flockStartDate?: string; // Date when flock was started (for age calculation)
}

const defaultSettings: FlockSettingsData = {
  totalChickens: 0,
  defaultDailyFeed: 0,
  lastUpdated: '',
  housingType: 'cages',
  flockStartDate: ''
};

export const useFlockSettings = () => {
  const { currentCompany } = useCompany();
  const [settings, setSettings] = useState<FlockSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from API
  const loadSettings = useCallback(async () => {
    if (!currentCompany?.id) {
      setIsLoading(false);
      return;
    }

    // Don't load if company ID is empty (placeholder)
    if (currentCompany.id === '') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await djangoApi.flockSettings.get(currentCompany.id);
      if (data) {
        setSettings({
          id: data.id,
          company_id: data.company_id,
          totalChickens: data.total_chickens,
          defaultDailyFeed: parseFloat(data.default_daily_feed) || 0,
          lastUpdated: data.updated_at ? new Date(data.updated_at).toLocaleDateString() : '',
          housingType: data.housing_type || 'cages',
          flockStartDate: data.flock_start_date || '',
        });
      }
    } catch (error) {
      console.error('Error loading flock settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id]);

  // Load on mount and when company changes
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Calculate feed per chicken (based on current flock size after mortality)
  const getCurrentFlockSize = (): number => {
    // For now, return totalChickens. In future, we can integrate with mortality records
    return settings.totalChickens;
  };

  const currentFlockSize = getCurrentFlockSize();
  
  // Calculate feed per chicken based on current flock size
  const feedPerChicken = currentFlockSize > 0 && settings.defaultDailyFeed > 0
    ? (settings.defaultDailyFeed / currentFlockSize)
    : 0;

  // Calculate flock age in weeks
  const getFlockAgeInWeeks = (): number | null => {
    if (!settings.flockStartDate) return null;
    const startDate = new Date(settings.flockStartDate);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(daysSinceStart / 7);
  };

  // Check if feed consumption is abnormal
  // Normal feed for laying hens is 0.1-0.15 kg per day
  // Abnormal if > 0.3 kg per chicken per day
  const isFeedAbnormal = feedPerChicken > 0.3;
  
  // Get abnormal warning message
  const getFeedWarning = () => {
    if (settings.totalChickens === 0 || settings.defaultDailyFeed === 0) {
      return null;
    }
    if (feedPerChicken > 0.3) {
      return {
        level: 'error' as const,
        message: `⚠️ ABNORMAL: ${feedPerChicken.toFixed(2)} kg per chicken per day is extremely high! Normal is 0.1-0.15 kg. Check your feed amount.`
      };
    } else if (feedPerChicken > 0.2) {
      return {
        level: 'warning' as const,
        message: `⚠️ High: ${feedPerChicken.toFixed(2)} kg per chicken per day is above normal range (0.1-0.15 kg).`
      };
    } else if (feedPerChicken > 0 && feedPerChicken < 0.08) {
      return {
        level: 'warning' as const,
        message: `⚠️ Low: ${feedPerChicken.toFixed(2)} kg per chicken per day is below normal range.`
      };
    }
    return null;
  };

  // Save settings to API
  const saveSettings = async (newSettings: Partial<FlockSettingsData>) => {
    if (!currentCompany?.id) return;

    try {
      // Convert camelCase to snake_case for API
      const apiData: any = {};
      if (newSettings.totalChickens !== undefined) apiData.total_chickens = newSettings.totalChickens;
      if (newSettings.defaultDailyFeed !== undefined) apiData.default_daily_feed = newSettings.defaultDailyFeed;
      if (newSettings.housingType !== undefined) apiData.housing_type = newSettings.housingType;
      if (newSettings.flockStartDate !== undefined) apiData.flock_start_date = newSettings.flockStartDate;
      apiData.company_id = currentCompany.id;

      if (settings.id) {
        // Update existing
        const result = await djangoApi.flockSettings.update(settings.id, apiData);
        setSettings({
          ...settings,
          ...{
            totalChickens: result.total_chickens,
            defaultDailyFeed: parseFloat(result.default_daily_feed) || 0,
            housingType: result.housing_type,
            flockStartDate: result.flock_start_date,
          },
          lastUpdated: new Date().toLocaleDateString(),
        });
      } else {
        // Create new
        const result = await djangoApi.flockSettings.create(apiData);
        setSettings({
          ...settings,
          ...{
            id: result.id,
            totalChickens: result.total_chickens,
            defaultDailyFeed: parseFloat(result.default_daily_feed) || 0,
            housingType: result.housing_type,
            flockStartDate: result.flock_start_date,
          },
          lastUpdated: new Date().toLocaleDateString(),
        });
      }
    } catch (error) {
      console.error('Error saving flock settings:', error);
      throw error;
    }
  };

  return {
    settings,
    isLoading,
    currentFlockSize,
    getCurrentFlockSize,
    feedPerChicken,
    isFeedAbnormal,
    getFeedWarning,
    getFlockAgeInWeeks,
    saveSettings,
    refresh: loadSettings
  };
};
