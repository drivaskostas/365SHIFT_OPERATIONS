
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
    this.isTracking = true;

    // Start immediate tracking
    await this.updateLocation(guardId);

    // Set up interval for every minute (60000ms)
    this.trackingInterval = setInterval(async () => {
      if (this.isTracking) {
        await this.updateLocation(guardId);
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

  private static async updateLocation(guardId: string): Promise<void> {
    try {
      // Get current position
      const position = await this.getCurrentPosition();
      
      if (!position) {
        console.warn('Could not get current position');
        return;
      }

      console.log('Updating location for guard:', guardId, position);

      // Check if guardian_geocodes record exists for this guard - using guardian_id not guard_id
      const { data: existingRecord } = await supabase
        .from('guardian_geocodes')
        .select('id')
        .eq('guardian_id', guardId)  // Fixed: using guardian_id instead of guard_id
        .single();

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
          .eq('guardian_id', guardId);  // Fixed: using guardian_id instead of guard_id

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
            guardian_id: guardId,  // Fixed: using guardian_id instead of guard_id
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

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // Cache for 1 minute
        }
      );
    });
  }

  static isCurrentlyTracking(): boolean {
    return this.isTracking;
  }
}
