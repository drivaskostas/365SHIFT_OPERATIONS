
import { supabase } from '@/lib/supabase'
import type { EmergencyReport } from '@/types/database'

export class EmergencyService {
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
    const currentLocation = location || await this.getCurrentLocation();

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
