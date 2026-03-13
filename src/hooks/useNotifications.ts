import { useState, useEffect, useMemo, useCallback } from 'react';
import djangoApi from '@/integrations/django/client';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';

export type AlertLevel = 'info' | 'warning' | 'error' | 'success';

export interface Notification {
  id: string;
  type: 'stock' | 'payment' | 'feed' | 'collection' | 'balance' | 'system';
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

const LOW_STOCK_THRESHOLD = 5; // trays
const HIGH_BALANCE_THRESHOLD = 5000; // KES

// Vaccination schedule based on user's chart (starting from March 18, 2025)
// Week 0 = Day 0 = March 18, 2025
// Only weeks 0-17 - future vaccinations are calculated dynamically from last date given
const VACCINATION_SCHEDULE = [
  { week: 0, name: "Marek's Disease", intervalDays: 0 },
  { week: 0, name: 'Newcastle (HB1)', intervalDays: 0 },
  { week: 1, name: 'Gumboro', intervalDays: 7 },
  { week: 2, name: 'Gumboro Booster', intervalDays: 7 },
  { week: 3, name: 'Newcastle (Lasota)', intervalDays: 7 },
  { week: 4, name: 'Fowl Pox', intervalDays: 7 },
  { week: 5, name: 'Fowl Typhoid', intervalDays: 7 },
  { week: 6, name: 'Infectious Bronchitis (IB)', intervalDays: 7 },
  { week: 8, name: 'Newcastle Booster', intervalDays: 14 },
  { week: 10, name: 'Fowl Typhoid Booster', intervalDays: 14 },
  { week: 16, name: 'Newcastle (Killed)', intervalDays: 42 },
  { week: 16, name: 'Egg Drop Syndrome (EDS)', intervalDays: 0 },
  { week: 17, name: 'IB Booster', intervalDays: 7 },
];

export const useNotifications = () => {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch notifications from API
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setIsInitialized(true);
      return;
    }
    
    try {
      const data = await djangoApi.notifications.list();
      setNotifications(data.map((n: any) => ({
        id: n.id,
        type: n.type,
        level: n.level,
        title: n.title,
        message: n.message,
        timestamp: new Date(n.created_at),
        read: n.read,
        actionUrl: n.action_url,
      })));
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsInitialized(true);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Mark a notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await djangoApi.notifications.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await djangoApi.notifications.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  // Delete a notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await djangoApi.notifications.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    // Delete all notifications one by one
    for (const notification of notifications) {
      try {
        await djangoApi.notifications.delete(notification.id);
      } catch (error) {
        console.error('Error clearing notifications:', error);
      }
    }
    setNotifications([]);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    isInitialized,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refresh: loadNotifications,
  };
};
