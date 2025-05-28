
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

    // Try to get initial position with very permissive settings
    const initialPosition = await this.getCurrentPositionWithRetry();
    if (!initialPosition) {
      console.warn('Could not get initial location after multiple attempts');
      return;
    }

    console.log('Initial location obtained successfully:', initialPosition);
    this.isTracking = true;

    // Update location immediately
    await this.updateLocation(guardId, initialPosition);

    // Set up interval for every minute (60000ms)
    this.trackingInterval = setInterval(async () => {
      if (this.isTracking) {
        console.log('Getting location update...');
        const position = await this.getCurrentPositionWithRetry();
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

  private static async getCurrentPositionWithRetry(): Promise<{ latitude: number; longitude: number } | null> {
    console.log('Attempting to get current position...');
    
    // First attempt with high accuracy
    let position = await this.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000 // 5 minutes
    });

    if (position) {
      return position;
    }

    console.log('High accuracy failed, trying with reduced accuracy...');
    
    // Second attempt with reduced accuracy
    position = await this.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 30000,
      maximumAge: 600000 // 10 minutes
    });

    if (position) {
      return position;
    }

    console.log('All location attempts failed');
    return null;
  }

  private static getCurrentPosition(options: PositionOptions): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      console.log('Requesting position with options:', options);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location obtained:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString()
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.code === 1,
            POSITION_UNAVAILABLE: error.code === 2,
            TIMEOUT: error.code === 3
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
        console.log('Permission status:', permission.state);
        return permission.state;
      } catch (error) {
        console.error('Error checking permission:', error);
        return 'unknown';
      }
    }
    return 'unknown';
  }
}
