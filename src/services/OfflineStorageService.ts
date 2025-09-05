interface OfflinePatrolData {
  patrolId: string;
  guardId: string;
  activities: OfflineActivity[];
  lastSync: string;
}

interface OfflineActivity {
  id: string;
  type: 'checkpoint_visit' | 'observation' | 'emergency' | 'location_update' | 'patrol_start' | 'patrol_end' | 'patrol_auto_end';
  data: any;
  timestamp: string;
  synced: boolean;
}

export class OfflineStorageService {
  private static readonly STORAGE_KEY = 'offline_patrol_data';
  private static readonly LOCATION_KEY = 'offline_locations';

  static savePatrolActivity(patrolId: string, guardId: string, activity: Omit<OfflineActivity, 'id' | 'synced'>) {
    try {
      const existingData = this.getOfflineData();
      const patrolData = existingData.find(p => p.patrolId === patrolId) || {
        patrolId,
        guardId,
        activities: [],
        lastSync: new Date().toISOString()
      };

      const newActivity: OfflineActivity = {
        ...activity,
        id: this.generateId(),
        synced: false
      };

      patrolData.activities.push(newActivity);

      // Update or add patrol data
      const updatedData = existingData.filter(p => p.patrolId !== patrolId);
      updatedData.push(patrolData);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData));
      console.log('✅ Saved offline activity:', newActivity.type, 'for patrol:', patrolId);
      
      return newActivity.id;
    } catch (error) {
      console.error('❌ Error saving offline activity:', error);
      return null;
    }
  }

  static saveLocationUpdate(guardId: string, patrolId: string, location: { latitude: number; longitude: number; accuracy?: number }) {
    try {
      const locationData = {
        id: this.generateId(),
        guardId,
        patrolId,
        ...location,
        timestamp: new Date().toISOString(),
        synced: false
      };

      const existingLocations = this.getOfflineLocations();
      existingLocations.push(locationData);

      // Keep only last 100 locations to avoid storage bloat
      const recentLocations = existingLocations.slice(-100);
      localStorage.setItem(this.LOCATION_KEY, JSON.stringify(recentLocations));
      
      console.log('✅ Saved offline location update for patrol:', patrolId);
      return locationData.id;
    } catch (error) {
      console.error('❌ Error saving offline location:', error);
      return null;
    }
  }

  static getOfflineData(): OfflinePatrolData[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error reading offline data:', error);
      return [];
    }
  }

  static getOfflineLocations() {
    try {
      const data = localStorage.getItem(this.LOCATION_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error reading offline locations:', error);
      return [];
    }
  }

  static getUnsyncedActivities(patrolId?: string): OfflineActivity[] {
    const allData = this.getOfflineData();
    const activities: OfflineActivity[] = [];

    allData.forEach(patrol => {
      if (!patrolId || patrol.patrolId === patrolId) {
        activities.push(...patrol.activities.filter(a => !a.synced));
      }
    });

    return activities;
  }

  static getUnsyncedLocations() {
    return this.getOfflineLocations().filter((loc: any) => !loc.synced);
  }

  static markActivitySynced(activityId: string) {
    try {
      const allData = this.getOfflineData();
      let found = false;

      allData.forEach(patrol => {
        patrol.activities.forEach(activity => {
          if (activity.id === activityId) {
            activity.synced = true;
            found = true;
          }
        });
      });

      if (found) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allData));
        console.log('✅ Marked activity as synced:', activityId);
      }
    } catch (error) {
      console.error('❌ Error marking activity as synced:', error);
    }
  }

  static markLocationSynced(locationId: string) {
    try {
      const locations = this.getOfflineLocations();
      const location = locations.find((loc: any) => loc.id === locationId);
      
      if (location) {
        location.synced = true;
        localStorage.setItem(this.LOCATION_KEY, JSON.stringify(locations));
        console.log('✅ Marked location as synced:', locationId);
      }
    } catch (error) {
      console.error('❌ Error marking location as synced:', error);
    }
  }

  static clearSyncedData() {
    try {
      // Remove synced activities
      const allData = this.getOfflineData();
      allData.forEach(patrol => {
        patrol.activities = patrol.activities.filter(a => !a.synced);
      });
      
      // Remove patrols with no unsynced activities
      const filteredData = allData.filter(patrol => patrol.activities.length > 0);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredData));

      // Remove synced locations
      const locations = this.getOfflineLocations();
      const unsyncedLocations = locations.filter((loc: any) => !loc.synced);
      localStorage.setItem(this.LOCATION_KEY, JSON.stringify(unsyncedLocations));

      console.log('✅ Cleared synced offline data');
    } catch (error) {
      console.error('❌ Error clearing synced data:', error);
    }
  }

  static isOnline(): boolean {
    return navigator.onLine;
  }

  private static generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
