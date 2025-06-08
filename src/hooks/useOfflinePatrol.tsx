
import { useState, useEffect, useCallback, useRef } from 'react';
import { PatrolService } from '@/services/PatrolService';
import { OfflineStorageService } from '@/services/OfflineStorageService';
import { OfflineSyncService } from '@/services/OfflineSyncService';
import { useToast } from '@/components/ui/use-toast';

export const useOfflinePatrol = (guardId?: string) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const { toast } = useToast();
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update online status
  useEffect(() => {
    isMountedRef.current = true;

    const handleOnline = () => {
      if (!isMountedRef.current) return;
      
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
      if (!isMountedRef.current) return;
      
      setIsOnline(false);
      toast({
        title: "📴 Offline Mode",
        description: "Working offline. Data will sync when connection is restored.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [guardId, toast]);

  // Update unsynced count
  const updateUnsyncedCount = useCallback(() => {
    if (!isMountedRef.current) return;
    
    try {
      const status = PatrolService.getOfflineStatus();
      setUnsyncedCount(status.totalUnsynced);
    } catch (error) {
      console.error('Error updating unsynced count:', error);
    }
  }, []);

  // Sync offline data
  const syncOfflineData = useCallback(async () => {
    if (!guardId || syncStatus === 'syncing' || !isMountedRef.current) return;

    setSyncStatus('syncing');
    
    try {
      const success = await PatrolService.syncOfflineData(guardId);
      
      if (!isMountedRef.current) return;
      
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
      if (!isMountedRef.current) return;
      
      setSyncStatus('error');
      console.error('Sync error:', error);
      toast({
        title: "❌ Sync Error",
        description: "Failed to sync offline data. Will retry automatically.",
        variant: "destructive"
      });
    }

    // Reset status after 3 seconds
    setTimeout(() => {
      if (isMountedRef.current) {
        setSyncStatus('idle');
      }
    }, 3000);
  }, [guardId, syncStatus, toast, updateUnsyncedCount]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && guardId && unsyncedCount > 0 && isMountedRef.current) {
      syncOfflineData();
    }
  }, [isOnline, guardId, unsyncedCount, syncOfflineData]);

  // Update unsynced count on mount and periodically
  useEffect(() => {
    updateUnsyncedCount();
    
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        updateUnsyncedCount();
      }
    }, 5000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [updateUnsyncedCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    isOnline,
    syncStatus,
    unsyncedCount,
    syncOfflineData,
    hasUnsyncedData: unsyncedCount > 0
  };
};
