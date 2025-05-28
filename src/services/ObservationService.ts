
import { supabase } from '@/lib/supabase'
import type { PatrolObservation } from '@/types/database'

export class ObservationService {
  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    console.log('🔄 ObservationService: Getting current location...');
    
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('⚠️ Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

      // First try with high accuracy and short timeout
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ High accuracy location obtained for observation:', {
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
          console.warn('⚠️ High accuracy location failed for observation, trying with lower accuracy:', error);
          
          // Fallback to lower accuracy with longer timeout
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('✅ Fallback location obtained for observation:', {
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
              console.error('❌ All location attempts failed for observation:', fallbackError);
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
    console.log('📝 Creating observation with data:', {
      guardId,
      patrolId,
      teamId,
      title,
      description,
      severity,
      imageUrl: imageUrl ? 'provided' : 'none',
      location: location ? `${location.latitude}, ${location.longitude}` : 'none'
    });

    // Use provided location or try to get fresh location
    let finalLocation = location;
    if (!finalLocation) {
      console.log('🔄 No location provided, attempting to get fresh location...');
      finalLocation = await this.getCurrentLocation();
    }

    console.log('📍 Final location for observation:', finalLocation);

    const observationData = {
      guard_id: guardId,
      patrol_id: patrolId,
      team_id: teamId,
      title,
      description,
      severity,
      status: 'pending',
      image_url: imageUrl,
      latitude: finalLocation?.latitude || null,
      longitude: finalLocation?.longitude || null,
      timestamp: new Date().toISOString()
    };

    console.log('💾 Inserting observation data:', observationData);

    const { data, error } = await supabase
      .from('patrol_observations')
      .insert(observationData)
      .select()
      .single()

    if (error) {
      console.error('❌ Database error creating observation:', error);
      throw error;
    }

    console.log('✅ Observation created successfully:', data);
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
