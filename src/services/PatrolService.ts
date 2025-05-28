import { supabase } from '@/lib/supabase'
import type { PatrolSession, GuardianSite, PatrolCheckpointVisit, GuardianCheckpoint } from '@/types/database'

export class PatrolService {
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
          console.log('Location obtained:', {
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
          console.warn('High accuracy location failed, trying with lower accuracy:', error);
          // Fallback to lower accuracy
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('Fallback location obtained:', {
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
              console.error('Location access denied or failed:', fallbackError);
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

  static async startPatrol(siteId: string, guardId: string, teamId?: string): Promise<PatrolSession> {
    // First verify the guard is assigned to this site
    const { data: siteGuard, error: assignmentError } = await supabase
      .from('site_guards')
      .select('*')
      .eq('guard_id', guardId)
      .eq('site_id', siteId)
      .maybeSingle()

    if (assignmentError) throw assignmentError
    
    if (!siteGuard) {
      throw new Error('You are not assigned to this site. Please contact your supervisor.')
    }

    // Get the guard's team assignment if teamId is not provided
    let resolvedTeamId = teamId;
    if (!resolvedTeamId) {
      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', guardId)
        .maybeSingle()

      if (teamError) {
        console.error('Error fetching team assignment:', teamError)
        // Continue without team_id rather than failing
      } else if (teamMember) {
        resolvedTeamId = teamMember.team_id
      }
    }

    // Get current location with retries
    console.log('Attempting to get location for patrol start...');
    const location = await this.getCurrentLocation();
    console.log('Location for patrol start:', location);

    const { data, error } = await supabase
      .from('patrol_sessions')
      .insert({
        guard_id: guardId,
        site_id: siteId,
        team_id: resolvedTeamId,
        start_time: new Date().toISOString(),
        status: 'active',
        latitude: location?.latitude,
        longitude: location?.longitude
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async endPatrol(patrolId: string): Promise<PatrolSession> {
    // Get current location for end patrol
    console.log('Attempting to get location for patrol end...');
    const location = await this.getCurrentLocation();
    console.log('Location for patrol end:', location);

    const { data, error } = await supabase
      .from('patrol_sessions')
      .update({
        end_time: new Date().toISOString(),
        status: 'completed',
        updated_at: new Date().toISOString(),
        // Update location for end patrol (you might want separate end_latitude/end_longitude fields)
        latitude: location?.latitude,
        longitude: location?.longitude
      })
      .eq('id', patrolId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getActivePatrol(guardId: string): Promise<PatrolSession | null> {
    const { data, error } = await supabase
      .from('patrol_sessions')
      .select('*')
      .eq('guard_id', guardId)
      .eq('status', 'active')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }

  static async getAvailableSites(guardId: string): Promise<GuardianSite[]> {
    // First get the site IDs assigned to the guard
    const { data: siteAssignments, error: assignmentError } = await supabase
      .from('site_guards')
      .select('site_id')
      .eq('guard_id', guardId)

    if (assignmentError) throw assignmentError
    
    if (!siteAssignments || siteAssignments.length === 0) {
      return []
    }

    const siteIds = siteAssignments.map(assignment => assignment.site_id)

    // Then get the actual site details
    const { data, error } = await supabase
      .from('guardian_sites')
      .select('*')
      .eq('active', true)
      .in('id', siteIds)
      .order('name')

    if (error) throw error
    return data || []
  }

  static async recordCheckpointVisit(
    patrolId: string,
    checkpointId: string,
    location?: { latitude: number; longitude: number }
  ): Promise<PatrolCheckpointVisit> {
    // Always get fresh location for checkpoint visits
    console.log('Attempting to get location for checkpoint visit...');
    const currentLocation = location || await this.getCurrentLocation();
    console.log('Location for checkpoint visit:', currentLocation);

    const { data, error } = await supabase
      .from('patrol_checkpoint_visits')
      .insert({
        patrol_id: patrolId,
        checkpoint_id: checkpointId,
        timestamp: new Date().toISOString(),
        status: 'completed',
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async validateCheckpoint(checkpointId: string, siteId: string): Promise<GuardianCheckpoint | null> {
    const { data, error } = await supabase
      .from('guardian_checkpoints')
      .select('*')
      .eq('id', checkpointId)
      .eq('site_id', siteId)
      .eq('active', true)
      .maybeSingle()

    if (error) throw error
    return data
  }

  static async getPatrolProgress(patrolId: string): Promise<{
    totalCheckpoints: number
    visitedCheckpoints: number
    progress: number
  }> {
    // Get site from patrol session
    const { data: patrol } = await supabase
      .from('patrol_sessions')
      .select('site_id')
      .eq('id', patrolId)
      .single()

    if (!patrol) return { totalCheckpoints: 0, visitedCheckpoints: 0, progress: 0 }

    // Get total checkpoints for the site
    const { count: totalCheckpoints } = await supabase
      .from('guardian_checkpoints')
      .select('*', { count: 'exact' })
      .eq('site_id', patrol.site_id)
      .eq('active', true)

    // Get visited checkpoints for this patrol
    const { count: visitedCheckpoints } = await supabase
      .from('patrol_checkpoint_visits')
      .select('*', { count: 'exact' })
      .eq('patrol_id', patrolId)
      .eq('status', 'completed')

    const progress = totalCheckpoints ? Math.round((visitedCheckpoints || 0) / totalCheckpoints * 100) : 0

    return {
      totalCheckpoints: totalCheckpoints || 0,
      visitedCheckpoints: visitedCheckpoints || 0,
      progress
    }
  }
}
