import { supabase } from '@/lib/supabase';
import { OfflineStorageService } from './OfflineStorageService';

export class LocationTrackingService {
  private static isTracking: boolean = false;
  private static trackingInterval: any;
  private static currentGuardId: string | null = null;
  private static currentPatrolId: string | null = null;
  private static readonly TRACKING_INTERVAL = 60000; // 60 seconds
  private static isShuttingDown: boolean = false;

  static startTracking(guardId: string, patrolId?: string): boolean {
    if (this.isCurrentlyTracking()) {
      console.log('Location tracking already active');
      return true;
    }

    if (!('geolocation' in navigator)) {
      console.error('Geolocation not supported');
      return false;
    }

    console.log('🚀 Starting location tracking for guard:', guardId, 'patrol:', patrolId);

    this.currentGuardId = guardId;
    this.currentPatrolId = patrolId;
    this.isShuttingDown = false;

    // Start periodic location updates
    this.trackingInterval = setInterval(async () => {
      // Check if we're shutting down
      if (this.isShuttingDown) {
        this.stopTracking();
        return;
      }

      try {
        const position = await this.getCurrentPosition();
        
        if (position && this.currentGuardId && !this.isShuttingDown) {
          await this.saveLocationUpdate(this.currentGuardId, position, this.currentPatrolId);
        }
      } catch (error) {
        console.error('❌ Error during location tracking:', error);
        // Don't stop tracking on single errors, just log them
      }
    }, this.TRACKING_INTERVAL);

    this.isTracking = true;
    console.log('✅ Location tracking started successfully');
    return true;
  }

  static stopTracking(): void {
    console.log('🛑 Stopping location tracking...');
    this.isShuttingDown = true;
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    this.isTracking = false;
    this.currentGuardId = null;
    this.currentPatrolId = null;
    this.isShuttingDown = false;
    
    console.log('🛑 Location tracking stopped');
  }

  static isCurrentlyTracking(): boolean {
    return this.isTracking && !this.isShuttingDown;
  }

  private static async getCurrentPosition(): Promise<GeolocationPosition | null> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Geolocation timeout'));
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          console.log('📍 Location obtained:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          resolve(position);
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error('❌ Location access failed:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  }

  private static async saveLocationUpdate(
    guardId: string, 
    position: GeolocationPosition, 
    patrolId?: string
  ): Promise<void> {
    if (this.isShuttingDown) {
      console.log('📍 Skipping location save - shutting down');
      return;
    }

    const locationData = {
      guard_id: guardId,
      patrol_id: patrolId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      tracking_type: 'patrol',
      on_duty: true,
      created_at: new Date().toISOString()
    };

    console.log('📍 Saving location update:', {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      patrol: patrolId,
      online: OfflineStorageService.isOnline()
    });

    try {
      if (OfflineStorageService.isOnline()) {
        // Save to database when online
        const { error } = await supabase
          .from('guard_locations')
          .insert(locationData);

        if (error) {
          console.error('❌ Error saving location to database:', error);
          // Fallback to offline storage
          this.saveLocationOffline(guardId, patrolId, position);
        } else {
          console.log('✅ Location saved to database successfully');
        }
      } else {
        // Save to offline storage when offline
        this.saveLocationOffline(guardId, patrolId, position);
      }
    } catch (error) {
      console.error('❌ Error in saveLocationUpdate:', error);
      // Fallback to offline storage
      this.saveLocationOffline(guardId, patrolId, position);
    }
  }

  private static saveLocationOffline(
    guardId: string, 
    patrolId: string | undefined, 
    position: GeolocationPosition
  ): void {
    try {
      OfflineStorageService.saveLocationUpdate(guardId, patrolId || '', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
      console.log('📴 Location saved offline');
    } catch (error) {
      console.error('❌ Error saving location offline:', error);
    }
  }

  static async getRecentLocations(guardId: string, limit: number = 5): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('guard_locations')
        .select('*')
        .eq('guard_id', guardId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching recent locations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getRecentLocations:', error);
      return [];
    }
  }

  static async forcePermissionReset(): Promise<boolean> {
    try {
      // Clear any cached settings (browser-specific)
      localStorage.removeItem('location_permission_granted');
      sessionStorage.removeItem('location_permission_granted');

      console.log('✅ Location permission cache cleared');
      return true;
    } catch (error) {
      console.error('❌ Error in forcePermissionReset:', error);
      return false;
    }
  }

  static getBrowserResetInstructions(): { browser: string; instructions: string[] } {
    const browser = navigator.userAgent.toLowerCase();

    if (browser.includes('chrome')) {
      return {
        browser: 'Chrome',
        instructions: [
          "1. Go to Chrome Settings → Privacy and security → Site Settings → Location",
          "2. Find this site in the 'Permissions' section and remove it",
          "3. Restart Chrome and try again"
        ]
      };
    } else if (browser.includes('safari')) {
      return {
        browser: 'Safari',
        instructions: [
          "1. Go to Safari Preferences → Websites → Location",
          "2. Find this site in the list and change the permission to 'Deny'",
          "3. Restart Safari and try again"
        ]
      };
    } else if (browser.includes('firefox')) {
      return {
        browser: 'Firefox',
        instructions: [
          "1. Go to Firefox Preferences → Privacy & Security → Permissions → Location → Settings",
          "2. Find this site in the list and change the permission to 'Block'",
          "3. Restart Firefox and try again"
        ]
      };
    } else {
      return {
        browser: 'Browser',
        instructions: [
          "1. Check your browser's settings for location permissions",
          "2. Find this site in the list and remove or deny the permission",
          "3. Restart your browser and try again"
        ]
      };
    }
  }

  static async testLocationNow(): Promise<{
    success: boolean;
    position?: GeolocationPosition;
    error?: GeolocationPositionError;
    recommendations?: string[];
  }> {
    try {
      const position = await this.getCurrentPosition();
      return { success: true, position };
    } catch (error: any) {
      console.error('❌ Location test failed:', error);

      const recommendations: string[] = [];
      if (error.code === 1) {
        recommendations.push("Ensure location access is enabled in your browser settings");
        recommendations.push("Check that you haven't accidentally blocked location access for this site");
      } else if (error.code === 2) {
        recommendations.push("Try moving to an area with better GPS signal");
        recommendations.push("Ensure your device's location services are enabled");
      } else if (error.code === 3) {
        recommendations.push("Check your internet connection");
        recommendations.push("Try again later");
      }

      return {
        success: false,
        error,
        recommendations
      };
    }
  }

  static async requestLocationPermission(): Promise<boolean> {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'granted') {
        console.log('✅ Location permission already granted');
        return true;
      } else if (permission.state === 'prompt') {
        console.log('🔄 Requesting location permission...');
        // This will trigger the browser's permission prompt
        const position = await this.getCurrentPosition();
        if (position) {
          console.log('✅ Location permission granted by user');
          return true;
        } else {
          console.warn('❌ Location permission denied by user');
          return false;
        }
      } else {
        console.warn('❌ Location permission denied or not supported');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting location permission:', error);
      return false;
    }
  }
}
