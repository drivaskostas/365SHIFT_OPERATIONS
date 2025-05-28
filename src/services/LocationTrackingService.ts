
import { supabase } from '@/integrations/supabase/client';

export class LocationTrackingService {
  private static trackingInterval: NodeJS.Timeout | null = null;
  private static isTracking = false;

  static async startTracking(guardId: string): Promise<void> {
    if (this.isTracking) {
      console.log('Location tracking already active');
      return;
    }

    console.log('Starting location tracking for guard:', guardId);

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return;
    }

    // Try to get initial position
    console.log('Attempting to get initial location...');
    const initialPosition = await this.getLocationWithRetry();
    if (initialPosition) {
      console.log('Initial location obtained successfully:', initialPosition);
      await this.updateGuardLocation(guardId, initialPosition);
    } else {
      console.warn('Could not get initial location, but starting tracking anyway');
    }

    this.isTracking = true;

    // Set up interval for every minute (60000ms)
    this.trackingInterval = setInterval(async () => {
      if (this.isTracking) {
        console.log('Getting location update...');
        const position = await this.getLocationWithRetry();
        if (position) {
          await this.updateGuardLocation(guardId, position);
        } else {
          console.warn('Failed to get location update');
        }
      }
    }, 60000);

    console.log('Location tracking started successfully');
  }

  static stopTracking(): void {
    console.log('Stopping location tracking');
    this.isTracking = false;
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  private static async updateGuardLocation(guardId: string, position: { latitude: number; longitude: number }): Promise<void> {
    try {
      console.log('Updating guard location:', guardId, position);

      // Insert into guard_locations table (the correct table for location tracking)
      const { data, error } = await supabase
        .from('guard_locations')
        .insert({
          guard_id: guardId,
          latitude: position.latitude,
          longitude: position.longitude,
          on_duty: true,
          tracking_type: 'patrol',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Error saving location to guard_locations:', error);
        throw error;
      } else {
        console.log('Location saved successfully to guard_locations:', data);
      }
    } catch (error) {
      console.error('Error in location tracking database operation:', error);
      // Don't throw here to avoid breaking the tracking loop
    }
  }

  // Enhanced location retrieval with multiple fallback strategies
  private static async getLocationWithRetry(): Promise<{ latitude: number; longitude: number } | null> {
    // Strategy 1: High accuracy, short timeout
    let position = await this.getLocationDirect({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    });
    
    if (position) return position;

    // Strategy 2: Lower accuracy, longer timeout
    position = await this.getLocationDirect({
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000
    });
    
    if (position) return position;

    // Strategy 3: Any cached location within 5 minutes
    position = await this.getLocationDirect({
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 300000
    });
    
    return position;
  }

  private static async getLocationDirect(options: PositionOptions): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Location obtained:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('❌ Location error:', {
            code: error.code,
            message: error.message,
            options: options
          });
          resolve(null);
        },
        options
      );
    });
  }

  static isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  static async checkPermissionStatus(): Promise<string> {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state;
      } catch (error) {
        console.error('Error checking permission:', error);
        return 'unknown';
      }
    }
    return 'unknown';
  }

  // Force fresh permission request with cache busting
  static async requestLocationPermission(): Promise<boolean> {
    console.log('🔄 Requesting fresh location permission with cache busting...');
    
    return new Promise((resolve) => {
      // Use a very aggressive approach to force permission dialog
      const options = {
        enableHighAccuracy: true,
        timeout: 3000,
        maximumAge: 0 // Force fresh request, no cache
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Permission granted and location obtained:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          resolve(true);
        },
        (error) => {
          console.error('❌ Permission request failed:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.code === 1,
            POSITION_UNAVAILABLE: error.code === 2,
            TIMEOUT: error.code === 3
          });
          
          // If it's a permission denied error, try to clear any cached permissions
          if (error.code === 1) {
            console.log('🔄 Permission denied, trying cache clearing approach...');
            // For Chrome, try to use a watchPosition briefly to reset state
            const watchId = navigator.geolocation.watchPosition(
              (pos) => {
                console.log('✅ Watch position success, clearing and resolving true');
                navigator.geolocation.clearWatch(watchId);
                resolve(true);
              },
              (watchError) => {
                console.error('❌ Watch position also failed:', watchError.message);
                navigator.geolocation.clearWatch(watchId);
                resolve(false);
              },
              { enableHighAccuracy: false, timeout: 2000, maximumAge: 0 }
            );
            
            // Clear watch after 2 seconds
            setTimeout(() => {
              navigator.geolocation.clearWatch(watchId);
            }, 2000);
          } else {
            resolve(false);
          }
        },
        options
      );
    });
  }

  // Test location access with detailed feedback
  static async testLocationNow(): Promise<{ success: boolean; position?: any; error?: any; debugInfo?: any }> {
    console.log('🧪 Testing location access with detailed debugging...');
    
    const debugInfo = {
      browser: navigator.userAgent,
      permissions: 'permissions' in navigator,
      geolocation: 'geolocation' in navigator,
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol
    };

    console.log('Debug info:', debugInfo);
    
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Test successful:', position);
          resolve({ 
            success: true, 
            position: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            },
            debugInfo
          });
        },
        (error) => {
          console.error('❌ Test failed:', error);
          resolve({ 
            success: false, 
            error: {
              code: error.code,
              message: error.message,
              PERMISSION_DENIED: error.code === 1,
              POSITION_UNAVAILABLE: error.code === 2,
              TIMEOUT: error.code === 3
            },
            debugInfo
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0 // Force fresh request
        }
      );
    });
  }

  // Get recent location data from database
  static async getRecentLocations(guardId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('guard_locations')
        .select('*')
        .eq('guard_id', guardId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent locations:', error);
        return [];
      }

      console.log('Recent locations from database:', data);
      return data || [];
    } catch (error) {
      console.error('Error in getRecentLocations:', error);
      return [];
    }
  }
}
