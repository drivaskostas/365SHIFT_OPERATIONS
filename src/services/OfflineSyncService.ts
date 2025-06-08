
import { supabase } from '@/lib/supabase';
import { OfflineStorageService } from './OfflineStorageService';

export class OfflineSyncService {
  private static syncInProgress = false;
  private static syncQueue: Array<() => Promise<void>> = [];

  static async syncAllData(guardId: string): Promise<boolean> {
    if (this.syncInProgress) {
      console.log('⏳ Sync already in progress, skipping...');
      return false;
    }

    if (!OfflineStorageService.isOnline()) {
      console.log('📴 Device is offline, cannot sync');
      return false;
    }

    this.syncInProgress = true;
    console.log('🔄 Starting offline data sync...');

    try {
      const unsyncedActivities = OfflineStorageService.getUnsyncedActivities();
      const unsyncedLocations = OfflineStorageService.getUnsyncedLocations();

      console.log(`📊 Found ${unsyncedActivities.length} unsynced activities and ${unsyncedLocations.length} unsynced locations`);

      // Sync locations first
      await this.syncLocations(unsyncedLocations);

      // Sync activities
      await this.syncActivities(unsyncedActivities);

      // Clean up synced data
      OfflineStorageService.clearSyncedData();

      console.log('✅ Offline sync completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error during offline sync:', error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  private static async syncLocations(locations: any[]) {
    for (const location of locations) {
      try {
        const { error } = await supabase
          .from('guard_locations')
          .insert({
            guard_id: location.guardId,
            patrol_id: location.patrolId,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            created_at: location.timestamp
          });

        if (error) {
          console.error('❌ Error syncing location:', error);
        } else {
          OfflineStorageService.markLocationSynced(location.id);
          console.log('✅ Synced location:', location.id);
        }
      } catch (error) {
        console.error('❌ Error syncing location:', location.id, error);
      }
    }
  }

  private static async syncActivities(activities: any[]) {
    for (const activity of activities) {
      try {
        let synced = false;

        switch (activity.type) {
          case 'checkpoint_visit':
            synced = await this.syncCheckpointVisit(activity);
            break;
          case 'observation':
            synced = await this.syncObservation(activity);
            break;
          case 'emergency':
            synced = await this.syncEmergencyReport(activity);
            break;
          default:
            console.warn('⚠️ Unknown activity type:', activity.type);
        }

        if (synced) {
          OfflineStorageService.markActivitySynced(activity.id);
          console.log('✅ Synced activity:', activity.type, activity.id);
        }
      } catch (error) {
        console.error('❌ Error syncing activity:', activity.id, error);
      }
    }
  }

  private static async syncCheckpointVisit(activity: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('patrol_checkpoint_visits')
        .insert({
          patrol_id: activity.data.patrolId,
          checkpoint_id: activity.data.checkpointId,
          timestamp: activity.timestamp,
          status: 'completed',
          latitude: activity.data.latitude,
          longitude: activity.data.longitude,
          notes: activity.data.notes
        });

      return !error;
    } catch (error) {
      console.error('❌ Error syncing checkpoint visit:', error);
      return false;
    }
  }

  private static async syncObservation(activity: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('patrol_observations')
        .insert({
          guard_id: activity.data.guardId,
          patrol_id: activity.data.patrolId,
          team_id: activity.data.teamId,
          title: activity.data.title,
          description: activity.data.description,
          severity: activity.data.severity,
          status: 'pending',
          image_url: activity.data.imageUrl,
          latitude: activity.data.latitude,
          longitude: activity.data.longitude,
          timestamp: activity.timestamp
        });

      return !error;
    } catch (error) {
      console.error('❌ Error syncing observation:', error);
      return false;
    }
  }

  private static async syncEmergencyReport(activity: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('emergency_reports')
        .insert({
          guard_id: activity.data.guardId,
          patrol_id: activity.data.patrolId,
          team_id: activity.data.teamId,
          title: activity.data.title,
          description: activity.data.description,
          severity: activity.data.severity,
          status: 'pending',
          image_url: activity.data.imageUrl,
          location: activity.data.location,
          latitude: activity.data.latitude,
          longitude: activity.data.longitude,
          incident_time: activity.timestamp,
          involved_persons: activity.data.involvedPersons
        });

      return !error;
    } catch (error) {
      console.error('❌ Error syncing emergency report:', error);
      return false;
    }
  }

  static startAutoSync(guardId: string, intervalMs: number = 30000) {
    console.log('🔄 Starting auto-sync every', intervalMs / 1000, 'seconds');
    
    return setInterval(async () => {
      if (OfflineStorageService.isOnline()) {
        await this.syncAllData(guardId);
      }
    }, intervalMs);
  }

  static stopAutoSync(intervalId: number) {
    clearInterval(intervalId);
    console.log('⏹️ Stopped auto-sync');
  }
}
