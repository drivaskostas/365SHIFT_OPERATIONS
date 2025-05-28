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

    // Check permissions first
    await this.checkAndRequestPermissions();

    // Try to get initial position
    console.log('Attempting to get initial location...');
    const initialPosition = await this.getCurrentPositionWithRetry();
    if (!initialPosition) {
      console.warn('Could not get initial location after multiple attempts, but starting tracking anyway');
    } else {
      console.log('Initial location obtained successfully:', initialPosition);
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

  private static async checkAndRequestPermissions(): Promise<void> {
    console.log('=== PERMISSION DEBUG START ===');
    console.log('Current URL:', window.location.href);
    console.log('Protocol:', window.location.protocol);
    console.log('Is HTTPS:', window.location.protocol === 'https:');
    
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        console.log('Permission API result:', {
          state: permission.state,
          name: permission.name
        });
        
        permission.addEventListener('change', () => {
          console.log('Permission changed to:', permission.state);
        });
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    } else {
      console.log('Permissions API not supported');
    }
    
    // Check if running in secure context
    console.log('Is secure context:', window.isSecureContext);
    
    // Check navigator.geolocation availability
    console.log('Navigator.geolocation available:', !!navigator.geolocation);
    
    console.log('=== PERMISSION DEBUG END ===');
  }

  private static async getCurrentPositionWithRetry(): Promise<{ latitude: number; longitude: number } | null> {
    console.log('Attempting to get current position with retry logic...');
    
    // Try different approaches with increasing timeouts and different accuracy settings
    const attempts = [
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        description: 'Low accuracy, fast timeout'
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000, // 1 minute
        description: 'High accuracy, medium timeout'
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 600000, // 10 minutes
        description: 'Low accuracy, long timeout'
      }
    ];

    for (let i = 0; i < attempts.length; i++) {
      console.log(`=== LOCATION ATTEMPT ${i + 1}/${attempts.length} ===`);
      console.log('Strategy:', attempts[i].description);
      console.log('Options:', attempts[i]);
      
      const position = await this.getCurrentPosition(attempts[i]);
      if (position) {
        console.log(`✅ Success on attempt ${i + 1}:`, position);
        return position;
      }
      console.log(`❌ Attempt ${i + 1} failed, trying next approach...`);
      
      // Wait a bit between attempts
      if (i < attempts.length - 1) {
        console.log('Waiting 1 second before next attempt...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('🚫 All location attempts failed');
    return null;
  }

  private static getCurrentPosition(options: PositionOptions): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      console.log('📍 Requesting position with options:', options);
      console.log('⏰ Starting position request at:', new Date().toISOString());

      const startTime = Date.now();

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const endTime = Date.now();
          console.log('✅ Location obtained successfully in', endTime - startTime, 'ms');
          console.log('📊 Position details:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: new Date(position.timestamp).toISOString()
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          const endTime = Date.now();
          console.error('❌ Geolocation error after', endTime - startTime, 'ms');
          console.error('🔍 Error details:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.code === GeolocationPositionError.PERMISSION_DENIED,
            POSITION_UNAVAILABLE: error.code === GeolocationPositionError.POSITION_UNAVAILABLE,
            TIMEOUT: error.code === GeolocationPositionError.TIMEOUT,
            timestamp: new Date().toISOString()
          });
          
          // Additional debugging for permission denied
          if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
            console.error('🚨 PERMISSION DENIED - This means:');
            console.error('- User explicitly denied the permission request');
            console.error('- Or browser blocked it due to security policy');
            console.error('- Try resetting site permissions in browser');
            console.error('- Check if site is marked as blocked in browser settings');
          }
          
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

  // Enhanced test method with more debugging
  static async testLocationAccess(): Promise<{ success: boolean; position?: any; error?: any; debugInfo?: any }> {
    console.log('🧪 === TESTING LOCATION ACCESS ===');
    
    const debugInfo = {
      userAgent: navigator.userAgent,
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
      permissions: 'unknown'
    };
    
    // Check permissions
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        debugInfo.permissions = permission.state;
      } catch (error) {
        debugInfo.permissions = 'error: ' + error.message;
      }
    }
    
    console.log('🔍 Debug info:', debugInfo);
    
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error('❌ Geolocation not supported');
        resolve({ 
          success: false, 
          error: 'Geolocation not supported',
          debugInfo 
        });
        return;
      }

      console.log('📱 Making test geolocation request...');
      const startTime = Date.now();

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const endTime = Date.now();
          console.log('✅ Test location access successful in', endTime - startTime, 'ms');
          console.log('📍 Position:', position);
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
          const endTime = Date.now();
          console.error('❌ Test location access failed after', endTime - startTime, 'ms');
          console.error('📋 Full error:', error);
          resolve({ 
            success: false, 
            error: {
              code: error.code,
              message: error.message,
              name: error.constructor.name
            },
            debugInfo
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0 // Force fresh location
        }
      );
    });
  }

  // Method to reset and retry permissions
  static async resetAndRetryPermissions(): Promise<void> {
    console.log('🔄 Attempting to reset and retry permissions...');
    
    // Try to trigger a fresh permission request
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Permission reset successful, got position:', position);
          resolve();
        },
        (error) => {
          console.error('❌ Permission reset failed:', error);
          reject(error);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0 // Force fresh request
        }
      );
    });
  }
}
