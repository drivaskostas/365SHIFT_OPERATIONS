
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

    // Try to get location immediately to trigger permission request
    const initialPosition = await this.getCurrentPosition();
    if (!initialPosition) {
      console.warn('Could not get initial location, tracking will not start');
      return;
    }

    console.log('Initial location obtained:', initialPosition);
    this.isTracking = true;

    // Start immediate tracking with the initial position
    await this.updateLocation(guardId, initialPosition);

    // Set up interval for every minute (60000ms)
    this.trackingInterval = setInterval(async () => {
      if (this.isTracking) {
        const position = await this.getCurrentPosition();
        if (position) {
          await this.updateLocation(guardId, position);
        }
      }
    }, 60000);
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
      const { data: existingRecord } = await supabase
        .from('guardian_geocodes')
        .select('id')
        .eq('guardian_id', guardId)
        .maybeSingle();

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

  private static getCurrentPosition(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error('Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

      // First try with high accuracy
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('High accuracy location obtained:', {
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
          console.log('High accuracy location failed, trying with lower accuracy:', error);
          
          // Try again with lower accuracy
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('Lower accuracy location obtained:', {
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
              console.error('Location access denied or failed:', error);
              resolve(null);
            },
            {
              enableHighAccuracy: false,
              timeout: 15000,
              maximumAge: 600000 // 10 minutes
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  static isCurrentlyTracking(): boolean {
    return this.isTracking;
  }
}
