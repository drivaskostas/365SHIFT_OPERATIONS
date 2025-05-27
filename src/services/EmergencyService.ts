
import { supabase } from '@/lib/supabase'
import type { EmergencyReport } from '@/types/database'

export class EmergencyService {
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
          console.log('Emergency location obtained:', {
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
          console.warn('High accuracy location failed for emergency, trying with lower accuracy:', error);
          // Fallback to lower accuracy
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('Fallback emergency location obtained:', {
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
              console.error('Emergency location access denied or failed:', fallbackError);
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

  static async createEmergencyReport(
    guardId: string,
    patrolId: string | undefined,
    teamId: string | undefined,
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    imageUrl?: string,
    location?: { latitude: number; longitude: number }
  ): Promise<EmergencyReport> {
    // Always get fresh location if not provided
    console.log('Attempting to get location for emergency report...');
    const currentLocation = location || await this.getCurrentLocation();
    console.log('Location for emergency report:', currentLocation);

    const { data, error } = await supabase
      .from('emergency_reports')
      .insert({
        guard_id: guardId,
        patrol_id: patrolId,
        team_id: teamId,
        title,
        description,
        severity,
        status: 'pending',
        image_url: imageUrl,
        location: currentLocation ? `${currentLocation.latitude},${currentLocation.longitude}` : undefined,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
        incident_time: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getEmergencyReports(guardId: string): Promise<EmergencyReport[]> {
    const { data, error } = await supabase
      .from('emergency_reports')
      .select('*')
      .eq('guard_id', guardId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}
