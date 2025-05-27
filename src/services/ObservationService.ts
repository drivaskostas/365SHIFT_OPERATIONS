
import { supabase } from '@/lib/supabase'
import type { PatrolObservation } from '@/types/database'

export class ObservationService {
  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          resolve(null);
        },
        { 
          timeout: 10000,
          enableHighAccuracy: true,
          maximumAge: 60000
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
    const currentLocation = location || await this.getCurrentLocation();

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
