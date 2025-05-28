
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

    // Try to get initial position with aggressive retry
    console.log('Attempting to get initial location...');
    const initialPosition = await this.getCurrentPositionAggressive();
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
        const position = await this.getCurrentPositionAggressive();
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

  // More aggressive position retrieval with forced permission requests
  private static async getCurrentPositionAggressive(): Promise<{ latitude: number; longitude: number } | null> {
    console.log('🔄 Starting aggressive location retrieval...');
    
    // Strategy 1: Immediate quick attempt
    console.log('📍 Strategy 1: Quick cached location');
    let position = await this.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 3000,
      maximumAge: 600000 // 10 minutes - use cached if available
    });
    
    if (position) {
      console.log('✅ Quick cached location success:', position);
      return position;
    }

    // Strategy 2: Force fresh permission request with low accuracy
    console.log('📍 Strategy 2: Fresh permission request (low accuracy)');
    position = await this.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 0 // Force fresh request
    });
    
    if (position) {
      console.log('✅ Fresh low accuracy success:', position);
      return position;
    }

    // Strategy 3: High accuracy attempt
    console.log('📍 Strategy 3: High accuracy attempt');
    position = await this.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    });
    
    if (position) {
      console.log('✅ High accuracy success:', position);
      return position;
    }

    // Strategy 4: Last resort - very permissive settings
    console.log('📍 Strategy 4: Last resort - very permissive');
    position = await this.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 30000,
      maximumAge: 1800000 // 30 minutes
    });
    
    if (position) {
      console.log('✅ Last resort success:', position);
      return position;
    }

    console.log('❌ All aggressive strategies failed');
    return null;
  }

  private static getCurrentPosition(options: PositionOptions): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      console.log('📍 Requesting position with options:', options);

      const timeout = setTimeout(() => {
        console.log('⏰ Position request timed out');
        resolve(null);
      }, options.timeout || 10000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeout);
          console.log('✅ Position obtained:', {
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
          clearTimeout(timeout);
          console.error('❌ Geolocation error:', {
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
        return permission.state;
      } catch (error) {
        console.error('Error checking permission:', error);
        return 'unknown';
      }
    }
    return 'unknown';
  }

  // Simplified test method that forces a fresh permission request
  static async testLocationAccess(): Promise<{ success: boolean; position?: any; error?: any }> {
    console.log('🧪 Testing location access with fresh permission request...');
    
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ success: false, error: 'Geolocation not supported' });
        return;
      }

      // Force a fresh permission request by using maximumAge: 0
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
          timeout: 10000,
          maximumAge: 0 // This forces a fresh permission request
        }
      );
    });
  }

  // Force a fresh permission dialog
  static async forcePermissionRequest(): Promise<boolean> {
    console.log('🔄 Forcing fresh permission request...');
    
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Permission granted, location obtained');
          resolve(true);
        },
        (error) => {
          console.error('❌ Permission denied or error:', error);
          resolve(false);
        },
        {
          enableHighAccuracy: true, // This often triggers a fresh permission dialog
          timeout: 5000,
          maximumAge: 0 // Force fresh request
        }
      );
    });
  }
}
