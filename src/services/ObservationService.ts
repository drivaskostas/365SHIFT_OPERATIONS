
import { supabase } from '@/lib/supabase'
import type { PatrolObservation } from '@/types/database'

export class ObservationService {
  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

      // First try with high accuracy
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Observation location obtained:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('High accuracy location failed for observation, trying with lower accuracy:', error);
          // Fallback to lower accuracy
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('Fallback observation location obtained:', {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              });
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            (fallbackError) => {
              console.error('Observation location access denied or failed:', fallbackError);
              resolve(null);
            },
            { 
              timeout: 15000,
              enableHighAccuracy: false,
              maximumAge: 300000 // 5 minutes
            }
          );
        },
        { 
          timeout: 8000,
          enableHighAccuracy: true,
          maximumAge: 60000 // 1 minute
        }
      );
    });
  }

  static async createObservation(
    guardId: string,
    patrolId: string | undefined,
    teamId: string | undefined,
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    imageUrl?: string,
    location?: { latitude: number; longitude: number }
  ): Promise<PatrolObservation> {
    // Always get fresh location if not provided
    console.log('Attempting to get location for observation...');
    const currentLocation = location || await this.getCurrentLocation();
    console.log('Location for observation:', currentLocation);

    const { data, error } = await supabase
      .from('patrol_observations')
      .insert({
        guard_id: guardId,
        patrol_id: patrolId,
        team_id: teamId,
        title,
        description,
        severity,
        status: 'pending',
        image_url: imageUrl,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
        timestamp: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getObservations(guardId: string): Promise<PatrolObservation[]> {
    const { data, error } = await supabase
      .from('patrol_observations')
      .select('*')
      .eq('guard_id', guardId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}
