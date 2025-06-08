
import { useState, useEffect, useCallback } from 'react';
import { PatrolService } from '@/services/PatrolService';
import { OfflineStorageService } from '@/services/OfflineStorageService';
import { OfflineSyncService } from '@/services/OfflineSyncService';
import { useToast } from '@/components/ui/use-toast';

export const useOfflinePatrol = (guardId?: string) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const { toast } = useToast();

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "🟢 Back Online",
        description: "Connection restored. Syncing data...",
      });
      
      if (guardId) {
        syncOfflineData();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "📴 Offline Mode",
        description: "Working offline. Data will sync when connection is restored.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [guardId, toast]);

  // Update unsynced count
  const updateUnsyncedCount = useCallback(() => {
    const status = PatrolService.getOfflineStatus();
    setUnsyncedCount(status.totalUnsynced);
  }, []);

  // Sync offline data
  const syncOfflineData = useCallback(async () => {
    if (!guardId || syncStatus === 'syncing') return;

    setSyncStatus('syncing');
    
    try {
      const success = await PatrolService.syncOfflineData(guardId);
      
      if (success) {
        setSyncStatus('success');
        updateUnsyncedCount();
        toast({
          title: "✅ Sync Complete",
          description: "All offline data has been synchronized.",
        });
      } else {
        setSyncStatus('error');
        toast({
          title: "❌ Sync Failed",
          description: "Some data could not be synchronized. Will retry automatically.",
          variant: "destructive"
        });
      }
    } catch (error) {
      setSyncStatus('error');
      console.error('Sync error:', error);
      toast({
        title: "❌ Sync Error",
        description: "Failed to sync offline data. Will retry automatically.",
        variant: "destructive"
      });
    }

    // Reset status after 3 seconds
    setTimeout(() => setSyncStatus('idle'), 3000);
  }, [guardId, syncStatus, toast, updateUnsyncedCount]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && guardId && unsyncedCount > 0) {
      syncOfflineData();
    }
  }, [isOnline, guardId, unsyncedCount, syncOfflineData]);

  // Update unsynced count on mount and periodically
  useEffect(() => {
    updateUnsyncedCount();
    const interval = setInterval(updateUnsyncedCount, 5000);
    return () => clearInterval(interval);
  }, [updateUnsyncedCount]);

  return {
    isOnline,
    syncStatus,
    unsyncedCount,
    syncOfflineData,
    hasUnsyncedData: unsyncedCount > 0
  };
};
