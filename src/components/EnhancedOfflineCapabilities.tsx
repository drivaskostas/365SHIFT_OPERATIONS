import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Download, Upload, RefreshCw, Database } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOfflinePatrol } from '@/hooks/useOfflinePatrol';
import { PatrolService } from '@/services/PatrolService';
import { OfflineStorageService } from '@/services/OfflineStorageService';
import { useToast } from '@/components/ui/use-toast';

interface OfflineCapabilitiesProps {
  className?: string;
}

export const EnhancedOfflineCapabilities: React.FC<OfflineCapabilitiesProps> = ({ className }) => {
  const { profile } = useAuth();
  const { isOnline, syncStatus, unsyncedCount, hasUnsyncedData, syncOfflineData } = useOfflinePatrol(profile?.id);
  const { toast } = useToast();
  const [offlineStats, setOfflineStats] = useState({
    totalActivities: 0,
    totalLocations: 0,
    lastSync: null as string | null
  });

  // Update offline statistics
  useEffect(() => {
    const updateStats = () => {
      const activities = OfflineStorageService.getUnsyncedActivities();
      const locations = OfflineStorageService.getUnsyncedLocations();
      
      setOfflineStats({
        totalActivities: activities.length,
        totalLocations: locations.length,
        lastSync: localStorage.getItem('last_sync_time')
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleForceSync = async () => {
    if (!profile?.id) return;
    
    toast({
      title: "🔄 Force Sync Started",
      description: "Attempting to sync all offline data..."
    });

    try {
      await syncOfflineData();
      localStorage.setItem('last_sync_time', new Date().toISOString());
      toast({
        title: "✅ Force Sync Complete", 
        description: "All offline data has been synchronized successfully."
      });
    } catch (error) {
      toast({
        title: "❌ Force Sync Failed",
        description: "Failed to sync offline data. Check your connection.",
        variant: "destructive"
      });
    }
  };

  const clearOfflineData = () => {
    try {
      OfflineStorageService.clearSyncedData();
      toast({
        title: "🗑️ Offline Data Cleared",
        description: "Successfully cleared synchronized offline data."
      });
      setOfflineStats(prev => ({ ...prev, totalActivities: 0, totalLocations: 0 }));
    } catch (error) {
      toast({
        title: "❌ Clear Failed",
        description: "Failed to clear offline data.",
        variant: "destructive"
      });
    }
  };

  const getConnectionStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (hasUnsyncedData) return 'text-orange-500';
    return 'text-green-500';
  };

  const getConnectionStatusText = () => {
    if (!isOnline) return 'Offline - Data saved locally';
    if (hasUnsyncedData) return `Online - ${unsyncedCount} items to sync`;
    return 'Online - All data synchronized';
  };

  const getSyncStatusBadge = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Badge variant="secondary" className="animate-pulse">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Syncing...
        </Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">
          <Upload className="h-3 w-3 mr-1" />
          Synced
        </Badge>;
      case 'error':
        return <Badge variant="destructive">
          <WifiOff className="h-3 w-3 mr-1" />
          Error
        </Badge>;
      default:
        return hasUnsyncedData ? 
          <Badge variant="secondary">
            <Database className="h-3 w-3 mr-1" />
            Pending
          </Badge> : 
          <Badge variant="outline">
            <Wifi className="h-3 w-3 mr-1" />
            Ready
          </Badge>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className={`h-4 w-4 ${getConnectionStatusColor()}`} />
            ) : (
              <WifiOff className={`h-4 w-4 ${getConnectionStatusColor()}`} />
            )}
            <span>Offline Capabilities</span>
          </div>
          {getSyncStatusBadge()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Connection Status</span>
          <span className={`text-sm font-medium ${getConnectionStatusColor()}`}>
            {getConnectionStatusText()}
          </span>
        </div>

        {/* Offline Statistics */}
        {(offlineStats.totalActivities > 0 || offlineStats.totalLocations > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Unsynced Activities</span>
              <span className="font-medium">{offlineStats.totalActivities}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Unsynced Locations</span>
              <span className="font-medium">{offlineStats.totalLocations}</span>
            </div>
          </div>
        )}

        {offlineStats.lastSync && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Sync</span>
            <span className="font-medium">
              {new Date(offlineStats.lastSync).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {isOnline && hasUnsyncedData && (
            <Button
              onClick={handleForceSync}
              disabled={syncStatus === 'syncing'}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Upload className="h-3 w-3 mr-1" />
              Force Sync
            </Button>
          )}
          
          {(offlineStats.totalActivities > 0 || offlineStats.totalLocations > 0) && (
            <Button
              onClick={clearOfflineData}
              size="sm"
              variant="ghost"
              className="flex-1"
            >
              <Database className="h-3 w-3 mr-1" />
              Clear Cache
            </Button>
          )}
        </div>

        {/* Offline Mode Info */}
        {!isOnline && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            📴 Working offline. Patrol activities, checkpoints, and observations are being saved locally and will sync automatically when connection is restored.
          </div>
        )}
      </CardContent>
    </Card>
  );
};