
import { supabase } from '@/lib/supabase'
import type { EmergencyReport } from '@/types/database'

export class EmergencyService {
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
        location: location ? `${location.latitude},${location.longitude}` : undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
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
