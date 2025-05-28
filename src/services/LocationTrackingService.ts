
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

    // Try to get initial position with a simple, direct approach
    console.log('Attempting to get initial location...');
    const initialPosition = await this.getLocationDirect();
    if (!initialPosition) {
      console.warn('Could not get initial location, but starting tracking anyway');
    } else {
      console.log('Initial location obtained successfully:', initialPosition);
      await this.updateLocation(guardId, initialPosition);
    }

    this.isTracking = true;

    // Set up interval for every minute (60000ms)
    this.trackingInterval = setInterval(async () => {
      if (this.isTracking) {
        console.log('Getting location update...');
        const position = await this.getLocationDirect();
        if (position) {
          await this.updateLocation(guardId, position);
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

  private static async updateLocation(guardId: string, position: { latitude: number; longitude: number }): Promise<void> {
    try {
      console.log('Updating location for guard:', guardId, position);

      // Check if guardian_geocodes record exists for this guard
      const { data: existingRecord, error: selectError } = await supabase
        .from('guardian_geocodes')
        .select('id')
        .eq('guardian_id', guardId)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking existing location record:', selectError);
        return;
      }

      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('guardian_geocodes')
          .update({
            latitude: position.latitude,
            longitude: position.longitude,
            geocode_status: 'success',
            updated_at: new Date().toISOString()
          })
          .eq('guardian_id', guardId);

        if (error) {
          console.error('Error updating location:', error);
        } else {
          console.log('Location updated successfully');
        }
      } else {
        // Create new record
        const { error } = await supabase
          .from('guardian_geocodes')
          .insert({
            guardian_id: guardId,
            latitude: position.latitude,
            longitude: position.longitude,
            geocode_status: 'success',
            address: null,
            formatted_address: null
          });

        if (error) {
          console.error('Error creating location record:', error);
        } else {
          console.log('Location record created successfully');
        }
      }
    } catch (error) {
      console.error('Error in location tracking:', error);
    }
  }

  // Simple, direct location request
  private static async getLocationDirect(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Location obtained:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('❌ Location error:', error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0 // Force fresh request
        }
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

  // Force browser to show fresh permission dialog
  static async requestLocationPermission(): Promise<boolean> {
    console.log('🔄 Requesting fresh location permission...');
    
    return new Promise((resolve) => {
      // Use watchPosition briefly to force a permission dialog
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          console.log('✅ Permission granted and location obtained');
          navigator.geolocation.clearWatch(watchId);
          resolve(true);
        },
        (error) => {
          console.error('❌ Permission request failed:', error.message);
          navigator.geolocation.clearWatch(watchId);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
      
      // Clear watch after 5 seconds regardless
      setTimeout(() => {
        navigator.geolocation.clearWatch(watchId);
      }, 5000);
    });
  }

  // Test location access with immediate feedback
  static async testLocationNow(): Promise<{ success: boolean; position?: any; error?: any }> {
    console.log('🧪 Testing location access now...');
    
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Test successful:', position);
          resolve({ 
            success: true, 
            position: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            }
          });
        },
        (error) => {
          console.error('❌ Test failed:', error);
          resolve({ 
            success: false, 
            error: {
              code: error.code,
              message: error.message
            }
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  }
}
