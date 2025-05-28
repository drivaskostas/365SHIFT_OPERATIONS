
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

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return;
    }

    console.log('Attempting to get initial location...');
    const initialPosition = await this.getLocationWithRetry();
    if (initialPosition) {
      console.log('Initial location obtained successfully:', initialPosition);
      await this.updateGuardLocation(guardId, initialPosition);
    } else {
      console.warn('Could not get initial location, but starting tracking anyway');
    }

    this.isTracking = true;

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
      console.log('📍 Attempting to save location:', { guardId, position });

      const locationData = {
        guard_id: guardId,
        latitude: position.latitude,
        longitude: position.longitude,
        on_duty: true,
        tracking_type: 'patrol',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📍 Inserting location data:', locationData);

      const { data, error } = await supabase
        .from('guard_locations')
        .insert(locationData)
        .select();

      if (error) {
        console.error('❌ Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      } else {
        console.log('✅ Location saved successfully:', data);
      }
    } catch (error) {
      console.error('❌ Critical error in location tracking:', error);
    }
  }

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

  // Aggressive Chrome permission reset mechanism
  static async forcePermissionReset(): Promise<boolean> {
    console.log('🔄 Forcing complete permission reset...');
    
    try {
      // Step 1: Clear any existing watch positions
      if ('geolocation' in navigator) {
        console.log('Step 1: Clearing any existing watch positions');
        for (let i = 0; i < 100; i++) {
          navigator.geolocation.clearWatch(i);
        }
      }

      // Step 2: Force browser to re-evaluate permission
      console.log('Step 2: Attempting to trigger fresh permission dialog');
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('❌ Permission reset timeout');
          resolve(false);
        }, 10000);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeout);
            console.log('✅ Permission reset successful!', position.coords);
            resolve(true);
          },
          (error) => {
            clearTimeout(timeout);
            console.error('❌ Permission reset failed:', error);
            
            // For Chrome specifically, try the watchPosition trick
            if (error.code === 1 && navigator.userAgent.includes('Chrome')) {
              console.log('🔄 Trying Chrome-specific reset...');
              const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                  navigator.geolocation.clearWatch(watchId);
                  console.log('✅ Chrome reset successful!');
                  resolve(true);
                },
                (watchError) => {
                  navigator.geolocation.clearWatch(watchId);
                  console.error('❌ Chrome reset also failed:', watchError);
                  resolve(false);
                },
                { enableHighAccuracy: false, timeout: 3000, maximumAge: 0 }
              );
            } else {
              resolve(false);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0 // Force fresh request
          }
        );
      });
    } catch (error) {
      console.error('❌ Error in permission reset:', error);
      return false;
    }
  }

  // Manual browser reset instructions
  static getBrowserResetInstructions(): { browser: string; instructions: string[] } {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) {
      return {
        browser: 'Chrome',
        instructions: [
          '1. Click the 🔒 or ⓘ icon in the address bar',
          '2. Set Location to "Ask" or "Allow"',
          '3. Refresh the page completely (Ctrl+F5)',
          '4. Alternative: Go to Settings → Privacy → Site Settings → Location → Remove this site'
        ]
      };
    } else if (userAgent.includes('Safari')) {
      return {
        browser: 'Safari',
        instructions: [
          '1. Go to Safari → Preferences → Websites → Location',
          '2. Find this website and set to "Ask" or "Allow"',
          '3. Refresh the page',
          '4. Alternative: Safari → Privacy → Manage Website Data → Remove this site'
        ]
      };
    } else if (userAgent.includes('Firefox')) {
      return {
        browser: 'Firefox',
        instructions: [
          '1. Click the 🔒 icon in the address bar',
          '2. Click "Clear cookies and site data"',
          '3. Refresh the page',
          '4. Allow location when prompted'
        ]
      };
    } else {
      return {
        browser: 'Unknown',
        instructions: [
          '1. Clear browser cache and cookies for this site',
          '2. Refresh the page completely',
          '3. Allow location when prompted'
        ]
      };
    }
  }

  // Enhanced testing with detailed feedback
  static async testLocationNow(): Promise<{ 
    success: boolean; 
    position?: any; 
    error?: any; 
    debugInfo?: any;
    recommendations?: string[];
  }> {
    console.log('🧪 Starting comprehensive location test...');
    
    const debugInfo = {
      browser: navigator.userAgent,
      permissions: 'permissions' in navigator,
      geolocation: 'geolocation' in navigator,
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
      timestamp: new Date().toISOString()
    };

    console.log('Debug info:', debugInfo);

    // Check if we're in a secure context
    if (!window.isSecureContext) {
      return {
        success: false,
        error: { message: 'Location requires HTTPS' },
        debugInfo,
        recommendations: ['Switch to HTTPS', 'Location API requires secure context']
      };
    }
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: { message: 'Location request timeout', code: 3 },
          debugInfo,
          recommendations: [
            'Try refreshing the page',
            'Check if location is enabled in browser settings',
            'Clear browser cache and cookies'
          ]
        });
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeout);
          console.log('✅ Location test successful:', position);
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
          clearTimeout(timeout);
          console.error('❌ Location test failed:', error);
          
          const recommendations = [];
          if (error.code === 1) {
            recommendations.push(...this.getBrowserResetInstructions().instructions);
          } else if (error.code === 2) {
            recommendations.push('Check internet connection', 'Try moving to a different location');
          } else if (error.code === 3) {
            recommendations.push('Request timed out - try again', 'Check if GPS is enabled');
          }

          resolve({ 
            success: false, 
            error: {
              code: error.code,
              message: error.message,
              PERMISSION_DENIED: error.code === 1,
              POSITION_UNAVAILABLE: error.code === 2,
              TIMEOUT: error.code === 3
            },
            debugInfo,
            recommendations
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 0
        }
      );
    });
  }

  // Get recent location data from database with better error handling
  static async getRecentLocations(guardId: string, limit: number = 10): Promise<any[]> {
    try {
      console.log('📍 Fetching recent locations for guard:', guardId);
      
      const { data, error } = await supabase
        .from('guard_locations')
        .select('*')
        .eq('guard_id', guardId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching recent locations:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return [];
      }

      console.log('✅ Recent locations from database:', data);
      return data || [];
    } catch (error) {
      console.error('❌ Critical error in getRecentLocations:', error);
      return [];
    }
  }
}
