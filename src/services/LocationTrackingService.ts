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

    // Try to get initial position with multiple retry attempts
    console.log('Attempting to get initial location...');
    const initialPosition = await this.getCurrentPositionWithRetry();
    if (!initialPosition) {
      console.warn('Could not get initial location after multiple attempts, but starting tracking anyway');
      // Continue with tracking even if initial position fails
      // The interval will keep trying to get location updates
    } else {
      console.log('Initial location obtained successfully:', initialPosition);
      // Update location immediately if we got initial position
      await this.updateLocation(guardId, initialPosition);
    }

    this.isTracking = true;

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
    console.log('Attempting to get current position with retry logic...');
    
    // Try multiple approaches with different settings
    const attempts = [
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 600000 // 10 minutes
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutes
      },
      {
        enableHighAccuracy: false,
        timeout: 60000,
        maximumAge: 900000 // 15 minutes
      }
    ];

    for (let i = 0; i < attempts.length; i++) {
      console.log(`Location attempt ${i + 1}/${attempts.length} with options:`, attempts[i]);
      const position = await this.getCurrentPosition(attempts[i]);
      if (position) {
        console.log(`Success on attempt ${i + 1}:`, position);
        return position;
      }
      console.log(`Attempt ${i + 1} failed, trying next approach...`);
    }

    console.log('All location attempts failed');
    return null;
  }

  private static getCurrentPosition(options: PositionOptions): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      console.log('Requesting position with options:', options);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location obtained successfully:', {
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
          console.error('Geolocation error details:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.code === 1,
            POSITION_UNAVAILABLE: error.code === 2,
            TIMEOUT: error.code === 3,
            timestamp: new Date().toISOString()
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

  // Add a manual test method to help debug
  static async testLocationAccess(): Promise<{ success: boolean; position?: any; error?: any }> {
    console.log('Testing location access...');
    
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        resolve({ success: false, error: 'Geolocation not supported' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Test location access successful:', position);
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
          console.error('Test location access failed:', error);
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
          timeout: 30000,
          maximumAge: 600000
        }
      );
    });
  }
}
